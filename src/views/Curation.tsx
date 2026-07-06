import { useEffect, useMemo, useState } from 'react';
import { Layout, LayoutHeader, LayoutContent, LayoutPanel, VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Selector } from '@astryxdesign/core/Selector';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { Banner } from '@astryxdesign/core/Banner';
import { useResizable, ResizeHandle } from '@astryxdesign/core/Resizable';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { SmartThumb } from '../SmartThumb';
import { PageHeader } from './PageHeader';
import { fmt, emojiThumb } from './shared';
import { fetchCategoryArticles, deriveTrendKeywords, type ApiCategory, type ApiCategoryArticle } from '../api';

// ── 카테고리 인기글 (달력 + 큐레이션 보드) ──
// 실데이터: GET /popular/categorized/article/{y}/{m}/{d}. 배치가 카테고리별로 사전분류한 대표 인기글을
// 달력(일자별) → 보드(카테고리 섹션 + 대표글) → 구성 패널로 검수·노출. 실패 시 샘플 폴백.

const FALLBACK: ApiCategory[] = [
  { id: 1, name: '일상/라이프', articles: [
    { title: '자취 5년차가 알려주는 진짜 쉬운 자취요리 10선', cafe: '요리하는 자취생', grpcode: 'cook', fldid: 'A', dataid: 1, img: '', viewCount: 128400, commentCount: 320, url: '#' },
    { title: '다이소 신상 꿀템 정리.jpg', cafe: '살림의 여왕', grpcode: 'life', fldid: 'B', dataid: 2, img: '', viewCount: 98200, commentCount: 210, url: '#' },
  ] },
  { id: 2, name: '연예/엔터', articles: [
    { title: '아이돌 컴백 무대 직캠 모음.zip', cafe: '덕질하는사람들', grpcode: 'fan', fldid: 'C', dataid: 3, img: '', viewCount: 623100, commentCount: 765, url: '#' },
  ] },
  { id: 3, name: '스포츠', articles: [
    { title: '어제 경기 역전골 직관 후기', cafe: '축구사랑', grpcode: 'soc', fldid: 'D', dataid: 4, img: '', viewCount: 98200, commentCount: 540, url: '#' },
  ] },
];

const CAT_EMOJI: Record<string, string> = {
  '연예/엔터': '🎬', '동물/자연': '🐶', '흥미/유머': '😄', '일상/라이프': '🏠',
  '스포츠': '⚽', '정보/팁': '💡', '경제/재테크': '📈', '정치/시사': '📰', '연예': '🎬', '스포츠/게임': '🎮',
};
const PALETTE: [string, string][] = [['#EAF0F7', '#D3E2F0'], ['#FCE7E9', '#F6D3D8'], ['#EAF7EE', '#D5EEDD'], ['#FFF1E6', '#FBE0C8'], ['#F0ECFB', '#DFD7F4'], ['#E8F0FF', '#D1E1FC']];
const catThumb = (name: string, i: number) => { const [c1, c2] = PALETTE[i % PALETTE.length]; return emojiThumb(CAT_EMOJI[name] ?? '📌', c1, c2); };

// 게시글 유형 자동 분류 (제목 패턴 기반 — 운영자 수기 분류 대체)
type ArtType = '움짤' | '짤' | '모음' | '후기' | '정보' | '썰';
const TYPES: ArtType[] = ['짤', '움짤', '모음', '후기', '정보', '썰'];
const typeOf = (t: string): ArtType => {
  if (/\.gif|움짤/.test(t)) return '움짤';
  if (/모음|\.zip|정리표|\d+선|모음집|총정리/.test(t)) return '모음';
  if (/\.jpg|\.insta|\.jpeg|사진|짤/.test(t)) return '짤';
  if (/후기|구경|풍경|근황|현실/.test(t)) return '후기';
  if (/팁|방법|체크리스트|루틴|이유|정리|코스|하는 법|추천/.test(t)) return '정보';
  return '썰';
};

// 최근 배치가 있는 날짜 후보 (오늘부터 역순 14일)
function dayCandidates(now = new Date()): { y: number; m: number; d: number }[] {
  const out = [];
  for (let i = 0; i < 14; i++) { const dt = new Date(now); dt.setDate(dt.getDate() - i); out.push({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }); }
  return out;
}
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TARGET = 12; // 카테고리별 노출 목표(운영 관례)

export function Curation() {
  const days = useMemo(() => dayCandidates(), []);
  const [mode, setMode] = useState<'board' | 'calendar'>('board');
  const [dayIdx, setDayIdx] = useState(0);
  const [cats, setCats] = useState<ApiCategory[] | null>(null);
  const [dataMode, setDataMode] = useState<'live' | 'mock' | 'loading'>('loading');
  const [selCat, setSelCat] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState<string>('전체');
  const [typeFilter, setTypeFilter] = useState<'전체' | ArtType>('전체');
  const [hotOnly, setHotOnly] = useState(false);
  const [exposed, setExposed] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const isNarrow = useMediaQuery('(max-width: 1200px)');
  const panel = useResizable({ defaultSize: 340, minSizePx: 300, maxSizePx: 480 });

  const cur = days[dayIdx];
  const dateLabel = `${cur.y}.${String(cur.m).padStart(2, '0')}.${String(cur.d).padStart(2, '0')}`;

  useEffect(() => {
    let alive = true;
    setDataMode('loading'); setSelCat(null);
    fetchCategoryArticles(cur.y, cur.m, cur.d, 12, TARGET)
      .then((res) => { if (!alive) return; setCats(res); setDataMode(res.length ? 'live' : 'mock'); setSelCat(res[0]?.id ?? null); })
      .catch(() => { if (alive) { setCats(null); setDataMode('mock'); } });
    return () => { alive = false; };
  }, [dayIdx, cur.y, cur.m, cur.d]);

  const data = dataMode === 'live' && cats && cats.length ? cats : FALLBACK;
  const allArticles = useMemo(() => data.flatMap((c) => c.articles), [data]);
  const totalArticles = allArticles.length;
  // 이번 일자 인기 키워드 — 제목 빈도(실데이터 파생), 유행 배지/필터 근거
  const hotWords = useMemo(() => deriveTrendKeywords(allArticles.map((a) => ({ title: a.title, viewcnt: a.viewCount } as never)), 10).map((o) => o.w), [allArticles]);
  const isHot = (t: string) => hotWords.some((w) => t.includes(w));
  const key = (a: ApiCategoryArticle) => `${a.grpcode}/${a.fldid}/${a.dataid}`;
  const catNames = useMemo(() => ['전체', ...data.map((c) => c.name)], [data]);

  const matchType = (a: ApiCategoryArticle) => typeFilter === '전체' || typeOf(a.title) === typeFilter;
  const matchHot = (a: ApiCategoryArticle) => !hotOnly || isHot(a.title);
  const visibleCats = useMemo(() => data
    .filter((c) => catFilter === '전체' || c.name === catFilter)
    .map((c) => ({ ...c, articles: c.articles.filter((a) => matchType(a) && matchHot(a)) }))
    .filter((c) => c.articles.length > 0), [data, catFilter, typeFilter, hotOnly, hotWords]);

  const sel = data.find((c) => c.id === selCat) ?? null;
  const exposedCount = allArticles.filter((a) => exposed[key(a)]).length;

  // 카드
  const artCard = (a: ApiCategoryArticle, ci: number, catName: string, compact = false) => {
    const k = key(a);
    const on = !!exposed[k];
    return (
      <Card key={k} padding={3}>
        <HStack gap={3} vAlign="start">
          <SmartThumb src={a.img} fallback={catThumb(catName, ci)} alt={a.title} label={a.title}
            onClick={() => a.url && a.url !== '#' && window.open(a.url, '_blank')} style={{ width: compact ? 44 : 56, height: compact ? 44 : 56, flexShrink: 0 }} />
          <StackItem size="fill">
            <VStack gap={1}>
              <Text weight="medium" maxLines={2}>{a.title}</Text>
              <HStack gap={1} vAlign="center" wrap="wrap">
                <Text type="supporting" color="accent" maxLines={1}>{a.cafe}</Text>
                <Badge variant="cyan" label={typeOf(a.title)} />
                {isHot(a.title) && <Badge variant="green" label="🔥 유행" />}
              </HStack>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="supporting" color="secondary">👁 {fmt(a.viewCount)} · 💬 {fmt(a.commentCount)}</Text>
              </HStack>
            </VStack>
          </StackItem>
          <Button label={on ? '노출됨' : '노출'} variant={on ? 'secondary' : 'ghost'} size="sm" onClick={() => setExposed((s) => ({ ...s, [k]: !s[k] }))} />
        </HStack>
      </Card>
    );
  };

  // ── 달력 뷰 ──
  if (mode === 'calendar') {
    const first = new Date(cur.y, cur.m - 1, 1).getDay();
    const daysInMonth = new Date(cur.y, cur.m, 0).getDate();
    const inRange = (d: number) => days.some((x) => x.y === cur.y && x.m === cur.m && x.d === d);
    return (
      <VStack gap={5}>
        <PageHeader title="카테고리 인기글" meta={<Badge variant="neutral" label={`${cur.y}년 ${cur.m}월`} />}
          description="일자별 카테고리 인기글 배치 현황 · 날짜를 열면 큐레이션 보드로 이동"
          actions={<Button label="큐레이션 보드" variant="primary" size="md" onClick={() => setMode('board')} />} />
        <Grid columns={7} gap={2}>
          {WEEKDAYS.map((w) => <Text key={w} type="label" color="secondary">{w}</Text>)}
          {Array.from({ length: first }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const idx = days.findIndex((x) => x.y === cur.y && x.m === cur.m && x.d === d);
            const isSel = d === cur.d;
            const avail = inRange(d);
            return (
              <Card key={d} padding={2} minHeight={92} variant={isSel ? 'blue' : 'default'}>
                <VStack gap={1} height="100%">
                  <HStack justify="between" vAlign="center"><Text type="supporting" weight="bold">{d}</Text>{isSel && dataMode === 'live' && <Badge variant="green" label={`${data.length}`} />}</HStack>
                  <StackItem size="fill">
                    <VStack height="100%" vAlign="end">
                      {avail ? <Button label="열기" variant="ghost" size="sm" onClick={() => { setDayIdx(idx); setMode('board'); }} />
                             : <Text type="supporting" size="xsm" color="secondary">–</Text>}
                    </VStack>
                  </StackItem>
                </VStack>
              </Card>
            );
          })}
        </Grid>
      </VStack>
    );
  }

  // ── 큐레이션 보드 ──
  const detailBody = sel && (() => {
    const ci = data.findIndex((c) => c.id === sel.id);
    const exp = sel.articles.filter((a) => exposed[key(a)]).length;
    const top = [...sel.articles].sort((a, b) => b.viewCount - a.viewCount)[0];
    return (
      <VStack gap={4}>
        <HStack gap={2} vAlign="center" justify="between">
          <Heading level={4}>카테고리 구성</Heading>
          <IconButton label="닫기" variant="ghost" size="sm" icon={<Icon icon="close" size="sm" />} onClick={() => setSelCat(null)} />
        </HStack>
        <VStack gap={1}>
          <HStack gap={2} vAlign="center"><Badge variant="blue" label={sel.name} /><Text type="supporting" color="secondary">{sel.articles.length}건 · 노출 {exp}건</Text></HStack>
          <ProgressBar label="노출 진행" isLabelHidden value={exp} max={Math.max(sel.articles.length, TARGET)} variant={exp >= TARGET ? 'success' : 'accent'} />
        </VStack>
        {top && <Card padding={3} variant="purple"><VStack gap={1}><HStack gap={1} vAlign="center"><Icon icon={SparklesIcon} size="sm" /><Text type="label">대표글</Text></HStack><Text weight="medium" maxLines={2}>{top.title}</Text><Text type="supporting" color="secondary">{top.cafe} · 👁 {fmt(top.viewCount)}</Text></VStack></Card>}
        <Divider />
        <VStack gap={2}>{sel.articles.map((a) => artCard(a, ci, sel.name, true))}</VStack>
      </VStack>
    );
  })();

  const topCat = [...data].sort((a, b) => b.articles.length - a.articles.length)[0];

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={5}>
          <VStack gap={4}>
            <PageHeader title="카테고리 인기글"
              meta={<>
                {dataMode === 'live' ? <HStack gap={1} vAlign="center"><StatusDot variant="success" isPulsing label="실데이터" /><Badge variant="green" label="실데이터 연동" /></HStack>
                  : dataMode === 'loading' ? <Badge variant="neutral" label="불러오는 중…" />
                  : <HStack gap={1} vAlign="center"><StatusDot variant="warning" label="샘플" /><Badge variant="yellow" label="샘플(폴백)" /></HStack>}
                <Badge variant="blue" label={`${data.length}개 카테고리`} />
                <Badge variant="neutral" label={`${totalArticles}건`} />
                <Badge variant="neutral" label={`노출 ${exposedCount}`} />
              </>}
              description="/popular/categorized/article — 배치가 분류한 카테고리별 대표 인기글 (Cafe-Top 노출용)"
              actions={<>
                <Selector label="일자" isLabelHidden size="md" options={days.map((d, i) => ({ value: String(i), label: `${d.m}/${d.d}${i === 0 ? ' (오늘)' : ''}` }))}
                  value={String(dayIdx)} onChange={(v) => v && setDayIdx(Number(v))} />
                <Button label="달력" variant="secondary" size="md" icon={<Icon icon="calendar" size="sm" />} onClick={() => setMode('calendar')} />
              </>} />

            {dataMode === 'mock' && <Banner status="warning" title="샘플 데이터" description="사내망 API(/api)에 연결되지 않아 샘플로 표시됩니다. 실데이터는 사내망 배포 서버(:8080)로 접속하세요." />}

            {/* AI 요약 */}
            <Card padding={4} variant="purple">
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" wrap="wrap"><Badge variant="purple" label="AI 요약" /><Text weight="semibold">{dateLabel} · {data.length}개 카테고리 · 총 {totalArticles}건</Text></HStack>
                {topCat && <Text type="supporting">최다 구성 카테고리는 "{topCat.name}"({topCat.articles.length}건)이고, 유형은 제목 패턴으로 자동 분류됩니다.</Text>}
                {hotWords.length > 0 && <HStack gap={1} vAlign="center" wrap="wrap"><Text type="supporting" color="secondary">오늘 인기 키워드:</Text>{hotWords.slice(0, 8).map((k) => <Badge key={k} variant="green" label={`#${k}`} />)}</HStack>}
              </VStack>
            </Card>

            {/* 카테고리 요약 카드 */}
            <Grid columns={{ minWidth: 230 }} gap={3}>
              {data.map((c) => {
                const exp = c.articles.filter((a) => exposed[key(a)]).length;
                return (
                  <Card key={c.id} padding={4}>
                    <VStack gap={2}>
                      <HStack gap={1} vAlign="center"><Badge variant="blue" label={c.name} />{exp >= TARGET ? <Badge variant="green" label="완료" /> : exp > 0 ? <Badge variant="yellow" label={`${exp}/${TARGET}`} /> : <Badge variant="neutral" label={`${c.articles.length}건`} />}</HStack>
                      <ProgressBar label={c.name} isLabelHidden value={exp} max={Math.max(c.articles.length, TARGET)} variant={exp >= TARGET ? 'success' : 'accent'} />
                      <HStack gap={2} vAlign="center" justify="between">
                        <Text type="supporting" color="secondary">{c.articles.length}건 · 노출 {exp}</Text>
                        <Button label="구성 보기" variant="ghost" size="sm" onClick={() => setSelCat(c.id)} />
                      </HStack>
                    </VStack>
                  </Card>
                );
              })}
            </Grid>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={5}>
          <VStack gap={4}>
            {/* 필터 */}
            <VStack gap={2}>
              <HStack gap={2} vAlign="center"><Heading level={4}>카테고리 보드</Heading><Text type="supporting" color="secondary">카테고리별 대표 인기글 · 유형 태그 자동 지정 · 유행 키워드 자동 감지</Text></HStack>
              <HStack gap={2} wrap="wrap">
                {catNames.map((t) => <ToggleButton key={t} size="sm" label={t} isPressed={catFilter === t} onPressedChange={() => setCatFilter(t)} />)}
              </HStack>
              <HStack gap={2} wrap="wrap" vAlign="center">
                <Text type="supporting" color="secondary">유형</Text>
                {(['전체', ...TYPES] as const).map((t) => <ToggleButton key={t} size="sm" label={t} isPressed={typeFilter === t} onPressedChange={() => setTypeFilter(t)} />)}
                <ToggleButton size="sm" label="🔥 유행만" isPressed={hotOnly} onPressedChange={setHotOnly} />
                <StackItem size="fill" />
                <Button label="전체 열기" size="sm" variant="ghost" onClick={() => setCollapsed(new Set())} />
                <Button label="전체 닫기" size="sm" variant="ghost" onClick={() => setCollapsed(new Set(data.map((c) => c.id)))} />
              </HStack>
            </VStack>

            {visibleCats.length === 0
              ? <Card padding={6}><Text type="supporting" color="secondary">해당 조건의 카테고리·글이 없습니다.</Text></Card>
              : visibleCats.map((c) => {
                  const ci = data.findIndex((x) => x.id === c.id);
                  const open = !collapsed.has(c.id);
                  return (
                    <Collapsible key={c.id} isOpen={open}
                      onOpenChange={(o) => setCollapsed((s) => { const n = new Set(s); o ? n.delete(c.id) : n.add(c.id); return n; })}
                      trigger={<HStack gap={2} vAlign="center" wrap="wrap"><Badge variant="blue" label={c.name} /><Text weight="bold">{c.name}</Text><Badge variant="neutral" label={`${c.articles.length}건`} /><Button label="구성 보기" variant="ghost" size="sm" onClick={() => setSelCat(c.id)} /></HStack>}>
                      <Grid columns={{ minWidth: 320 }} gap={3}>{c.articles.map((a) => artCard(a, ci, c.name))}</Grid>
                    </Collapsible>
                  );
                })}
            {isNarrow && sel && (<><Divider />{detailBody}</>)}
          </VStack>
        </LayoutContent>
      }
      end={!isNarrow && sel && (
        <>
          <ResizeHandle resizable={panel.props} isReversed isAlwaysVisible={false} />
          <LayoutPanel hasDivider label="카테고리 구성" resizable={panel.props as never}>
            {detailBody}
          </LayoutPanel>
        </>
      )}
    />
  );
}
