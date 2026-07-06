import { Fragment, useEffect, useMemo, useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Token } from '@astryxdesign/core/Token';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { SmartThumb } from '../SmartThumb';
import { PageHeader } from './PageHeader';
import { fmt, emojiThumb } from './shared';
import {
  fetchDailyArticles, fetchPastArticles, weeklyAggdtCandidates, monthlyAggdtCandidates,
  fetchTrend, trendYmdhCandidates, deriveTrendKeywords, matchArticlesByKeyword,
  type ApiArticle, type TrendData,
} from '../api';

// ── 카페 트렌드 ──
// 기간 탭(실시간/주간/월간) → 시간대 셀렉터+메타 → AI 요약+대표 인기글 → 증감 배너 → [트렌드 검색어 | 위험 키워드] 2컬럼.
// 실시간=adm-table 실시간 트렌드(SELECTION), 주간/월간=인기글 제목 키워드 빈도 파생. 대표/확장 인기글은 실 corpus 매칭.

type Period = 'realtime' | 'weekly' | 'monthly';
type Row = { term: string; mention: number; delta: number | 'new' | null };
type CorpusArticle = ApiArticle & { period: '실시간' | '주간' | '월간' };
const PERIOD_VARIANT: Record<CorpusArticle['period'], 'green' | 'blue' | 'purple'> = { 실시간: 'green', 주간: 'blue', 월간: 'purple' };

const emo = ['📰', '🔥', '💬', '📸', '⚡', '🎬', '📝', '❗'];
const pal: [string, string][] = [['#EAF0F7', '#D3E2F0'], ['#FFF1E6', '#FBE0C8'], ['#FCE7E9', '#F6D3D8'], ['#F0ECFB', '#DFD7F4'], ['#EAF7EE', '#D5EEDD']];
const kwThumb = (i: number) => emojiThumb(emo[i % emo.length], pal[i % pal.length][0], pal[i % pal.length][1]);
const INITIAL_BLACK = ['이재명', '윤석열', '국민의힘', '국짐', '유시민', '정청래', '줄리', '국힘'];

const FALLBACK: CorpusArticle[] = [
  { rnum: 1, grpcode: 'a', grpid: '', fldid: 'A', dataid: '1', title: '손흥민 선제골 직관 후기 모음', cafe: '축구사랑', viewcnt: 65100, cmtcnt: 540, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'a/A/1', period: '실시간' },
  { rnum: 2, grpcode: 'b', grpid: '', fldid: 'B', dataid: '2', title: '손흥민 인터뷰 번역본', cafe: '樂soccer', viewcnt: 42000, cmtcnt: 210, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'b/B/2', period: '주간' },
  { rnum: 3, grpcode: 'c', grpid: '', fldid: 'C', dataid: '3', title: '자취요리 초간단 레시피 정리', cafe: '자취생', viewcnt: 38000, cmtcnt: 180, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'c/C/3', period: '월간' },
];

const COL = { rank: 36, mention: 96, delta: 84, actions: 92 } as const;
const hourLabel = (k: string) => `${k.slice(4, 6)}-${k.slice(6, 8)} ${k.slice(8, 10)}시`;
const ymdLabel = (k: string) => (k.length >= 8 ? `${k.slice(0, 4)}.${k.slice(4, 6)}.${k.slice(6, 8)}` : k);

// 파생(주간/월간) 키워드를 Row로
const derivedRows = (arts: ApiArticle[]): Row[] => deriveTrendKeywords(arts, 20).map((o) => ({ term: o.w, mention: o.views, delta: null }));

// 증감 배지
function Delta({ d }: { d: number | 'new' | null }) {
  if (d === 'new') return <Badge variant="green" label="NEW" />;
  if (d == null || d === 0) return <Text type="supporting" color="secondary">–</Text>;
  return d > 0
    ? <Text type="supporting" style={{ color: 'var(--color-red-60)' }}>▲{d}</Text>
    : <Text type="supporting" style={{ color: 'var(--color-blue-60)' }}>▼{-d}</Text>;
}

// 실 데이터 기반 자동 요약(상위 검색어·신규 진입·급상승)
function buildSummary(period: Period, rows: Row[]): { headline: string; points: string[] } {
  const label = period === 'realtime' ? '시간대' : period === 'weekly' ? '주간' : '월간';
  if (!rows.length) return { headline: '표시할 트렌드 데이터가 없습니다.', points: [] };
  const top3 = rows.slice(0, 3).map((r) => r.term).join(' · ');
  const news = rows.filter((r) => r.delta === 'new').map((r) => r.term);
  const risers = rows.filter((r) => typeof r.delta === 'number' && (r.delta as number) > 0).sort((a, b) => (b.delta as number) - (a.delta as number));
  const points: string[] = [];
  points.push(`상위 검색어: ${top3}`);
  if (news.length) points.push(`신규 진입(NEW) ${news.length}개 — ${news.slice(0, 5).join(', ')}${news.length > 5 ? ' 등' : ''}`);
  if (risers.length) points.push(`순위 상승: ${risers.slice(0, 3).map((r) => `${r.term}(▲${r.delta})`).join(', ')}`);
  points.push(`1위 "${rows[0].term}" ${period === 'realtime' ? '언급' : '합계조회'} ${fmt(rows[0].mention)}`);
  return { headline: `이번 ${label} 상위 검색어는 "${rows[0].term}"입니다.`, points };
}

export function Trend() {
  const [period, setPeriod] = useState<Period>('realtime');
  const [sort, setSort] = useState<'views' | 'comments'>('views');
  const [sel, setSel] = useState<string | null>(null);
  const [newKw, setNewKw] = useState('');
  const [localBlack, setLocalBlack] = useState<string[]>(INITIAL_BLACK);

  // 실시간 트렌드
  const hourCandidates = useMemo(() => trendYmdhCandidates(), []);
  const [hourKey, setHourKey] = useState<string>('');
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [rtMode, setRtMode] = useState<'live' | 'down' | 'loading'>('loading');

  // 인기글 corpus (실시간·주간·월간) + 파생 키워드
  const [corpus, setCorpus] = useState<CorpusArticle[] | null>(null);
  const [weeklyArts, setWeeklyArts] = useState<ApiArticle[]>([]);
  const [monthlyArts, setMonthlyArts] = useState<ApiArticle[]>([]);
  const [weeklyAgg, setWeeklyAgg] = useState('');
  const [monthlyAgg, setMonthlyAgg] = useState('');
  const [corpusMode, setCorpusMode] = useState<'live' | 'mock' | 'loading'>('loading');

  // corpus + 주간/월간 1회 로드
  useEffect(() => {
    let alive = true;
    const tag = (arr: ApiArticle[], p: CorpusArticle['period']): CorpusArticle[] => arr.map((a) => ({ ...a, period: p }));
    Promise.all([
      fetchDailyArticles({ size: 300 }).catch(() => [] as ApiArticle[]),
      fetchPastArticles('weekly', weeklyAggdtCandidates(), 200).catch(() => ({ aggdt: '', articles: [] as ApiArticle[] })),
      fetchPastArticles('monthly', monthlyAggdtCandidates(), 200).catch(() => ({ aggdt: '', articles: [] as ApiArticle[] })),
    ]).then(([daily, wk, mo]) => {
      if (!alive) return;
      setWeeklyArts(wk.articles); setMonthlyArts(mo.articles); setWeeklyAgg(wk.aggdt); setMonthlyAgg(mo.aggdt);
      const merged = [...tag(daily, '실시간'), ...tag(wk.articles, '주간'), ...tag(mo.articles, '월간')];
      const seen = new Set<string>();
      const pool = merged.filter((a) => (seen.has(a.permlink) ? false : (seen.add(a.permlink), true)));
      setCorpus(pool.length ? pool : null);
      setCorpusMode(pool.length ? 'live' : 'mock');
    });
    return () => { alive = false; };
  }, []);

  // 실시간 트렌드 로드(시간대 변경 시 재조회)
  useEffect(() => {
    let alive = true;
    setRtMode('loading'); setSel(null);
    const idx = hourKey ? Math.max(0, hourCandidates.indexOf(hourKey)) : 0;
    fetchTrend(hourCandidates.slice(idx)).then((t) => {
      if (!alive) return;
      if (t && t.selection.length) { setTrend(t); setHourKey((k) => k || t.key); setRtMode('live'); }
      else { setTrend(null); setRtMode('down'); }
    }).catch(() => { if (alive) { setTrend(null); setRtMode('down'); } });
    return () => { alive = false; };
  }, [hourKey, hourCandidates]);

  const data = corpus && corpus.length ? corpus : FALLBACK;
  const apiBlack = trend?.black ?? [];
  const blackSet = useMemo(() => new Set([...apiBlack, ...localBlack]), [apiBlack, localBlack]);

  // 기간별 Row
  const rowsAll: Row[] = useMemo(() => {
    if (period === 'realtime') return (trend?.selection ?? []).map((t) => ({ term: t.term, mention: t.count, delta: t.isNew ? 'new' : t.delta }));
    if (period === 'weekly') return derivedRows(weeklyArts);
    return derivedRows(monthlyArts);
  }, [period, trend, weeklyArts, monthlyArts]);
  const rows = useMemo(() => rowsAll.filter((r) => !blackSet.has(r.term)), [rowsAll, blackSet]);

  const summary = useMemo(() => buildSummary(period, rows), [period, rows]);
  const articlesFor = (w: string) => {
    const arts = matchArticlesByKeyword(w, data, 10);
    return [...arts].sort((a, b) => (sort === 'comments' ? b.cmtcnt - a.cmtcnt : b.viewcnt - a.viewcnt));
  };

  const metaBadge = period === 'realtime'
    ? (hourKey ? hourLabel(hourKey) : '—')
    : period === 'weekly' ? (weeklyAgg ? `${ymdLabel(weeklyAgg)} 주간` : '주간') : (monthlyAgg ? `${ymdLabel(monthlyAgg)} 월간` : '월간');
  const basis = period === 'realtime' ? '직전 시간대(1시간 전)' : period === 'weekly' ? '주간 집계' : '월간 집계';
  const loading = period === 'realtime' ? rtMode === 'loading' : corpusMode === 'loading';

  const addBlack = () => { const v = newKw.trim(); if (v && !blackSet.has(v)) setLocalBlack((b) => [...b, v]); setNewKw(''); };
  const removeKw = (w: string) => { if (!blackSet.has(w)) setLocalBlack((b) => [...b, w]); if (sel === w) setSel(null); };

  const headerCell = (label: string, width?: number, end = false) =>
    width ? <HStack width={width} justify={end ? 'end' : 'start'}><Text type="label" color="secondary">{label}</Text></HStack>
          : <StackItem size="fill"><Text type="label" color="secondary">{label}</Text></StackItem>;

  return (
    <VStack gap={5}>
      <PageHeader title="카페 트렌드"
        meta={<>
          {loading ? <Badge variant="neutral" label="불러오는 중…" />
            : period === 'realtime'
              ? (rtMode === 'live'
                  ? <HStack gap={1} vAlign="center"><StatusDot variant="success" isPulsing label="실시간 트렌드" /><Badge variant="green" label="실시간 트렌드" /></HStack>
                  : <HStack gap={1} vAlign="center"><StatusDot variant="warning" label="트렌드 미연결" /><Badge variant="yellow" label="트렌드 API 미연결" /></HStack>)
              : (corpusMode === 'live'
                  ? <HStack gap={1} vAlign="center"><StatusDot variant="success" label="인기글 파생" /><Badge variant="blue" label="인기글 파생" /></HStack>
                  : <HStack gap={1} vAlign="center"><StatusDot variant="warning" label="샘플" /><Badge variant="yellow" label="샘플(폴백)" /></HStack>)}
          <Badge variant="blue" label={`키워드 ${rows.length}`} />
          <Badge variant="neutral" label={metaBadge} />
        </>}
        description="실시간·주간·월간 급상승 검색 키워드 — 실시간은 adm-table 실데이터, 주간/월간은 인기글 파생"
        actions={
          <SegmentedControl value={period} onChange={(v) => { setPeriod(v as Period); setSel(null); }} label="기간" size="md">
            <SegmentedControlItem value="realtime" label="실시간" />
            <SegmentedControlItem value="weekly" label="주간" />
            <SegmentedControlItem value="monthly" label="월간" />
          </SegmentedControl>
        } />

      {/* 시간대 셀렉터 + 메타 */}
      <HStack gap={3} vAlign="center" wrap="wrap">
        <HStack gap={2} vAlign="center">
          <Text type="supporting" color="secondary">{period === 'realtime' ? '시간대' : '집계'}</Text>
          {period === 'realtime'
            ? <Selector label="시간대" isLabelHidden size="md" value={hourKey || hourCandidates[0]}
                options={hourCandidates.map((k) => ({ value: k, label: hourLabel(k) }))}
                onChange={(v) => v && setHourKey(v)} />
            : <Badge variant="neutral" label={metaBadge} />}
        </HStack>
        <StackItem size="fill"><HStack justify="end"><Text type="supporting" color="secondary">기준 데이터 <Text as="span" type="supporting" weight="semibold">{metaBadge}</Text></Text></HStack></StackItem>
      </HStack>

      {period === 'realtime' && rtMode === 'down' && <Banner status="warning" title="실시간 트렌드 미연결" description="트렌드 API(/trend)가 응답하지 않습니다(토큰 만료·사내망 확인). 주간/월간 탭은 인기글 파생으로 확인할 수 있습니다." />}
      {period !== 'realtime' && corpusMode === 'mock' && <Banner status="warning" title="샘플 데이터" description="사내망 API(/api)에 연결되지 않아 샘플로 표시됩니다. 실데이터는 사내망 배포 서버(:8080)로 접속하세요." />}

      {/* AI 요약 + 대표 인기글 */}
      <Card padding={5} variant="purple">
        <VStack gap={3}>
          <HStack gap={2} vAlign="center" wrap="wrap"><Badge variant="purple" label="AI 요약" /><Text weight="semibold">{summary.headline}</Text></HStack>
          {summary.points.length > 0 && <List listStyle="disc" density="compact">{summary.points.map((p, i) => <ListItem key={i} label={p} />)}</List>}
          <Divider />
          <Text type="label">대표 인기글 — 상위 검색어별 최고 조회글</Text>
          <Grid columns={{ minWidth: 300 }} gap={3}>
            {rows.slice(0, 3).map((o) => {
              const top = articlesFor(o.term)[0];
              return (
                <Card key={o.term} padding={3}>
                  <HStack gap={3} vAlign="center">
                    <SmartThumb src={top?.img} fallback={kwThumb(o.term.length)} alt={top?.title ?? o.term} label={top?.title ?? o.term} style={{ width: 48, height: 48, flexShrink: 0 }} />
                    <VStack gap={0}>
                      <HStack gap={1} vAlign="center" wrap="wrap"><Badge variant="blue" label={`#${o.term}`} /><Delta d={o.delta} /></HStack>
                      {top ? <><Text weight="medium" maxLines={1}>{top.title}</Text><Text type="supporting" color="secondary">{top.cafe} · 👁 {fmt(top.viewcnt)}</Text></>
                           : <Text type="supporting" color="secondary">매칭 인기글 없음 · 카페 검색 권장</Text>}
                    </VStack>
                  </HStack>
                </Card>
              );
            })}
          </Grid>
        </VStack>
      </Card>

      <Banner status="info" title="증감 기준" description={`증감은 ${basis} 대비입니다. NEW는 이번 ${period === 'realtime' ? '시간대' : '기간'}에 처음 진입한 검색어입니다.`} />

      {/* 2컬럼: 트렌드 검색어 | 위험 키워드 관리 */}
      <HStack gap={4} vAlign="start" wrap="wrap">
        <StackItem size="fill">
          <Card padding={0}>
            <Section padding={4}><HStack gap={2} vAlign="center"><Heading level={4}>트렌드 검색어</Heading><Text type="supporting" color="secondary">노출 {rows.length}개 · 위험 제외 {blackSet.size}개</Text></HStack></Section>
            <Divider />
            <Section padding={3}><HStack gap={3} vAlign="center">{headerCell('순위', COL.rank)}{headerCell('검색어')}{headerCell(period === 'realtime' ? '언급량' : '합계조회', COL.mention, true)}{headerCell('증감', COL.delta, true)}{headerCell('관리', COL.actions, true)}</HStack></Section>
            {rows.map((o, i) => {
              const open = sel === o.term;
              const arts = open ? articlesFor(o.term) : [];
              return (
                <Fragment key={o.term}>
                  <Divider />
                  <Section padding={3}>
                    <HStack gap={3} vAlign="center">
                      <HStack width={COL.rank}><Text weight="bold" color="secondary">{i + 1}</Text></HStack>
                      <StackItem size="fill"><HStack gap={2} vAlign="center"><Text weight="medium">{o.term}</Text>{i < 3 && <Badge variant="red" label="HOT" />}</HStack></StackItem>
                      <HStack width={COL.mention} justify="end"><Text type="supporting">{fmt(o.mention)}</Text></HStack>
                      <HStack width={COL.delta} justify="end"><Delta d={o.delta} /></HStack>
                      <HStack width={COL.actions} justify="end" gap={2}>
                        <Button label={open ? '닫기' : '인기글'} variant={open ? 'secondary' : 'ghost'} size="sm" onClick={() => setSel(open ? null : o.term)} />
                        <Button label="제외" variant="secondary" size="sm" onClick={() => removeKw(o.term)} />
                      </HStack>
                    </HStack>
                  </Section>
                  {open && (
                    <Section variant="muted" padding={4}>
                      <VStack gap={3}>
                        <HStack gap={2} vAlign="center" wrap="wrap">
                          <StackItem size="fill"><Text weight="bold">🔥 "{o.term}" 관련 유행글 {arts.length}건</Text></StackItem>
                          <SegmentedControl value={sort} onChange={(v) => setSort(v as never)} label="정렬" size="sm">
                            <SegmentedControlItem value="views" label="조회순" />
                            <SegmentedControlItem value="comments" label="댓글순" />
                          </SegmentedControl>
                        </HStack>
                        {arts.length === 0
                          ? <Text type="supporting" color="secondary">실시간·주간·월간 인기글에서 "{o.term}" 관련 글을 찾지 못했습니다.</Text>
                          : <Grid columns={{ minWidth: 250 }} gap={3}>
                              {arts.map((a, j) => (
                                <Card key={a.permlink} padding={3}>
                                  <HStack gap={3} vAlign="center">
                                    <Text weight="bold" color="secondary">{j + 1}</Text>
                                    <SmartThumb src={a.img} fallback={kwThumb(j)} alt={a.title} label={a.title}
                                      onClick={() => a.link && a.link !== '#' && window.open(a.link, '_blank')} style={{ width: 48, height: 48, flexShrink: 0 }} />
                                    <VStack gap={0}>
                                      <Text weight="medium" maxLines={1}>{a.title}</Text>
                                      <HStack gap={2} wrap="wrap"><Text type="supporting" color="accent">{a.cafe}</Text><Badge variant={PERIOD_VARIANT[a.period]} label={a.period} /><Text type="supporting" color="secondary">👁 {fmt(a.viewcnt)} · 💬 {fmt(a.cmtcnt)}</Text></HStack>
                                    </VStack>
                                  </HStack>
                                </Card>
                              ))}
                            </Grid>}
                      </VStack>
                    </Section>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && !loading && <><Divider /><Section padding={4}><Text type="supporting" color="secondary">표시할 검색어가 없습니다.</Text></Section></>}
          </Card>
        </StackItem>

        <Card padding={5} width={320}>
          <VStack gap={3}>
            <HStack gap={2} vAlign="center"><Heading level={4}>위험 키워드 관리</Heading><Text type="supporting" color="secondary">트렌드에서 제외</Text></HStack>
            <HStack gap={2} vAlign="center">
              <StackItem size="fill"><TextInput label="위험 키워드 추가" isLabelHidden size="sm" value={newKw} onChange={setNewKw} placeholder="제외할 검색어" /></StackItem>
              <Button label="추가" variant="secondary" size="sm" onClick={addBlack} />
            </HStack>
            {apiBlack.length > 0 && <Text type="supporting" color="secondary">차단(BLACK) {apiBlack.length}개는 서버 분류값입니다.</Text>}
            <HStack gap={2} wrap="wrap">
              {apiBlack.map((w) => <Token key={`api-${w}`} label={w} color="red" size="sm" />)}
              {localBlack.map((w) => <Token key={`loc-${w}`} label={w} color="red" size="sm" onRemove={() => setLocalBlack((b) => b.filter((x) => x !== w))} />)}
            </HStack>
          </VStack>
        </Card>
      </HStack>
    </VStack>
  );
}
