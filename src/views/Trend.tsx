import { Fragment, useEffect, useMemo, useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Token } from '@astryxdesign/core/Token';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { SmartThumb } from '../SmartThumb';
import { PageHeader } from './PageHeader';
import { fmt, emojiThumb } from './shared';
import {
  fetchDailyArticles, fetchTrend, trendYmdhCandidates, deriveTrendKeywords,
  type ApiArticle, type TrendData, type TrendTerm,
} from '../api';

// ── 카페 트렌드 (실시간 트렌드 키워드) ──
// adm-table /realtime-trend(serve.py /trend 중계) 의 SELECTION 랭킹(20)을 그대로 노출.
// NEW / ▲n / ▼n / - 은 직전 시간대 대비 순위 증감. 위험 키워드는 BLACK_KEYWORD 상태값.
// 대표 인기글은 실시간 인기글(/popular/article/daily) corpus에서 키워드 매칭으로 매핑.
// /trend 미가용(비사내망·토큰 미설정) 시 인기글 제목 키워드 빈도로 폴백.

const emo = ['📰', '🔥', '💬', '📸', '⚡', '🎬', '📝', '❗'];
const pal: [string, string][] = [['#EAF0F7', '#D3E2F0'], ['#FFF1E6', '#FBE0C8'], ['#FCE7E9', '#F6D3D8'], ['#F0ECFB', '#DFD7F4'], ['#EAF7EE', '#D5EEDD']];
const kwThumb = (i: number) => emojiThumb(emo[i % emo.length], pal[i % pal.length][0], pal[i % pal.length][1]);

const FALLBACK: ApiArticle[] = [
  { rnum: 1, grpcode: 'a', grpid: '', fldid: 'A', dataid: '1', title: '손흥민 선제골 직관 후기 모음', cafe: '축구사랑', viewcnt: 65100, cmtcnt: 540, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'a/A/1' },
  { rnum: 2, grpcode: 'b', grpid: '', fldid: 'B', dataid: '2', title: '손흥민 인터뷰 번역본', cafe: '樂soccer', viewcnt: 42000, cmtcnt: 210, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'b/B/2' },
  { rnum: 3, grpcode: 'c', grpid: '', fldid: 'C', dataid: '3', title: '자취요리 초간단 레시피 정리', cafe: '자취생', viewcnt: 38000, cmtcnt: 180, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'c/C/3' },
  { rnum: 4, grpcode: 'd', grpid: '', fldid: 'D', dataid: '4', title: '자취요리 밀프렙 일주일치', cafe: '자취생', viewcnt: 29000, cmtcnt: 90, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'd/D/4' },
];

const COL = { rank: 36, delta: 66, mention: 96, actions: 92 } as const;

// 순위 증감 표시 — NEW / ▲n / ▼n / -
function DeltaBadge({ term }: { term: TrendTerm }) {
  if (term.isNew) return <Badge variant="green" label="NEW" />;
  if (term.delta == null || term.delta === 0) return <Text type="supporting" color="secondary">–</Text>;
  return term.delta > 0
    ? <Text type="supporting" style={{ color: 'var(--color-red-60)' }}>▲{term.delta}</Text>
    : <Text type="supporting" style={{ color: 'var(--color-blue-60)' }}>▼{-term.delta}</Text>;
}

// 폴백(파생) 키워드를 TrendTerm 형태로 정규화
function derivedAsTerms(arts: ApiArticle[]): TrendTerm[] {
  return deriveTrendKeywords(arts, 20).map((o, i) => ({ term: o.w, count: o.count, isNew: false, score: o.views, rank: i + 1, delta: null }));
}

export function Trend() {
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [corpus, setCorpus] = useState<ApiArticle[] | null>(null);
  const [mode, setMode] = useState<'live' | 'derived' | 'mock' | 'loading'>('loading');
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setMode('loading'); setSel(null);
    // 트렌드 랭킹 + 대표 인기글 corpus를 병렬로
    Promise.all([
      fetchTrend(trendYmdhCandidates()).catch(() => null),
      fetchDailyArticles({ size: 100 }).catch(() => [] as ApiArticle[]),
    ]).then(([t, arts]) => {
      if (!alive) return;
      setCorpus(arts.length ? arts : null);
      if (t && t.selection.length) { setTrend(t); setMode('live'); }
      else if (arts.length) { setTrend(null); setMode('derived'); }
      else { setTrend(null); setMode('mock'); }
    });
    return () => { alive = false; };
  }, []);

  const data = corpus && corpus.length ? corpus : FALLBACK;
  const terms: TrendTerm[] = useMemo(
    () => (mode === 'live' && trend ? trend.selection : derivedAsTerms(data)),
    [mode, trend, data],
  );
  const black = trend?.black ?? [];
  const keyLabel = trend?.key ? `${trend.key.slice(0, 4)}-${trend.key.slice(4, 6)}-${trend.key.slice(6, 8)} ${trend.key.slice(8, 10)}시` : '';
  const articlesFor = (w: string) => data.filter((a) => a.title.includes(w)).sort((a, b) => b.viewcnt - a.viewcnt).slice(0, 8);

  const headerCell = (label: string, width?: number, end = false) =>
    width ? <HStack width={width} justify={end ? 'end' : 'start'}><Text type="label" color="secondary">{label}</Text></HStack>
          : <StackItem size="fill"><Text type="label" color="secondary">{label}</Text></StackItem>;

  return (
    <VStack gap={5}>
      <PageHeader title="카페 트렌드"
        meta={<>
          {mode === 'live' ? <HStack gap={1} vAlign="center"><StatusDot variant="success" isPulsing label="실시간 트렌드" /><Badge variant="green" label="실시간 트렌드" /></HStack>
            : mode === 'derived' ? <HStack gap={1} vAlign="center"><StatusDot variant="success" label="인기글 파생" /><Badge variant="blue" label="인기글 파생" /></HStack>
            : mode === 'loading' ? <Badge variant="neutral" label="불러오는 중…" />
            : <HStack gap={1} vAlign="center"><StatusDot variant="warning" label="샘플" /><Badge variant="yellow" label="샘플(폴백)" /></HStack>}
          <Badge variant="blue" label={`키워드 ${terms.length}`} />
          {keyLabel && <Badge variant="neutral" label={keyLabel} />}
        </>}
        description={mode === 'live'
          ? '실시간 트렌드 키워드 랭킹(직전 시간대 대비 증감 포함) — adm-table 실데이터'
          : '실시간 인기글 제목에서 키워드 빈도를 집계한 급상승 트렌드'} />

      {mode === 'mock' && <Banner status="warning" title="샘플 데이터" description="사내망 API(/api·/trend)에 연결되지 않아 샘플로 표시됩니다. 실데이터는 사내망 배포 서버(예: :8080)로 접속하세요." />}
      {mode === 'derived' && <Banner status="info" title="인기글 파생 모드" description="실시간 트렌드 API(/trend)가 응답하지 않아, 실시간 인기글 제목의 키워드 빈도로 대체 집계했습니다. (토큰/사내망 확인 필요)" />}

      <HStack gap={4} vAlign="start" wrap="wrap">
        <StackItem size="fill">
          <Card padding={0}>
            <Section padding={4}><HStack gap={2} vAlign="center"><Heading level={4}>급상승 키워드</Heading><Text type="supporting" color="secondary">{mode === 'live' ? `선정 ${terms.length}개 · 직전 시간대 대비` : `노출 ${terms.length}개`}</Text></HStack></Section>
            <Divider />
            <Section padding={3}><HStack gap={3} vAlign="center">{headerCell('순위', COL.rank)}{headerCell('키워드')}{headerCell('변동', COL.delta, true)}{headerCell(mode === 'live' ? '언급' : '합계 조회', COL.mention, true)}{headerCell('', COL.actions, true)}</HStack></Section>
            {terms.map((o, i) => {
              const open = sel === o.term;
              const arts = open ? articlesFor(o.term) : [];
              return (
                <Fragment key={o.term}>
                  <Divider />
                  <Section padding={3}>
                    <HStack gap={3} vAlign="center">
                      <HStack width={COL.rank}><Text weight="bold" color="secondary">{o.rank}</Text></HStack>
                      <StackItem size="fill"><HStack gap={2} vAlign="center"><Text weight="medium">{o.term}</Text>{i < 3 && <Badge variant="red" label="HOT" />}</HStack></StackItem>
                      <HStack width={COL.delta} justify="end"><DeltaBadge term={o} /></HStack>
                      <HStack width={COL.mention} justify="end"><Text type="supporting">{mode === 'live' ? `${fmt(o.count)}` : fmt(o.score)}</Text></HStack>
                      <HStack width={COL.actions} justify="end">
                        <Button label={open ? '닫기' : '인기글'} variant={open ? 'secondary' : 'ghost'} size="sm" onClick={() => setSel(open ? null : o.term)} />
                      </HStack>
                    </HStack>
                  </Section>
                  {open && (
                    <Section variant="muted" padding={4}>
                      <VStack gap={3}>
                        <Text weight="bold">🔥 “{o.term}” 대표 인기글 {arts.length}건</Text>
                        {arts.length === 0
                          ? <Text type="supporting" color="secondary">현재 인기글 corpus에서 “{o.term}” 관련 글을 찾지 못했습니다.</Text>
                          : <Grid columns={{ minWidth: 200 }} gap={3}>
                              {arts.map((a, j) => (
                                <Card key={a.permlink} padding={3}>
                                  <VStack gap={2} height="100%">
                                    <SmartThumb src={a.img} fallback={kwThumb(j)} alt={a.title} label={a.title}
                                      onClick={() => a.link && a.link !== '#' && window.open(a.link, '_blank')} style={{ width: '100%', height: 'auto' }} />
                                    <HStack gap={1} vAlign="center"><Badge variant={j < 3 ? 'red' : 'neutral'} label={`${j + 1}위`} /></HStack>
                                    <StackItem size="fill"><Text weight="medium" maxLines={2}>{a.title}</Text></StackItem>
                                    <HStack gap={2} wrap="wrap">
                                      <Text type="supporting" color="accent" maxLines={1}>{a.cafe}</Text>
                                      <Text type="supporting" color="secondary">👁 {fmt(a.viewcnt)} · 💬 {fmt(a.cmtcnt)}</Text>
                                    </HStack>
                                  </VStack>
                                </Card>
                              ))}
                            </Grid>}
                      </VStack>
                    </Section>
                  )}
                </Fragment>
              );
            })}
          </Card>
        </StackItem>

        <Card padding={5} width={320}>
          <VStack gap={3}>
            <HStack gap={2} vAlign="center"><Heading level={4}>위험 키워드</Heading><Text type="supporting" color="secondary">노출 차단(BLACK)</Text></HStack>
            {mode === 'live'
              ? (black.length
                  ? <><Text type="supporting" color="secondary">트렌드 후보 중 차단 상태로 분류된 키워드 {black.length}개입니다.</Text>
                     <HStack gap={2} wrap="wrap">{black.map((w) => <Token key={w} label={w} color="red" size="sm" />)}</HStack></>
                  : <Text type="supporting" color="secondary">현재 시간대에 차단된 키워드가 없습니다.</Text>)
              : <Text type="supporting" color="secondary">실시간 트렌드 API에 연결되면 차단(BLACK) 키워드가 여기에 표시됩니다.</Text>}
          </VStack>
        </Card>
      </HStack>
    </VStack>
  );
}
