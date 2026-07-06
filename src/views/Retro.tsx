import { useEffect, useMemo, useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Section } from '@astryxdesign/core/Section';
import { Pagination } from '@astryxdesign/core/Pagination';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Banner } from '@astryxdesign/core/Banner';
import { SmartThumb } from '../SmartThumb';
import { PageHeader } from './PageHeader';
import { fmt, emojiThumb } from './shared';
import { fetchPastArticles, weeklyAggdtCandidates, monthlyAggdtCandidates, type ApiArticle } from '../api';

// ── 주간·월간 인기글 (실데이터: GET /popular/{weekly|monthly}/articles/{aggdt}) ──
type Period = 'weekly' | 'monthly';

const FALLBACK: ApiArticle[] = [
  { rnum: 1, grpcode: 'cook', grpid: '', fldid: 'A', dataid: '1', title: '자취 5년차가 알려주는 진짜 쉬운 자취요리 10선', cafe: '요리하는 자취생', viewcnt: 1248000, cmtcnt: 3200, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'cook/A/1' },
  { rnum: 2, grpcode: 'soc', grpid: '', fldid: 'B', dataid: '2', title: '어제 경기 미쳤다… 후반 막판 역전골 직관 후기', cafe: '축구사랑 모임', viewcnt: 982000, cmtcnt: 2100, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'soc/B/2' },
  { rnum: 3, grpcode: 'plant', grpid: '', fldid: 'C', dataid: '3', title: '초보도 안 죽이는 실내식물 추천 + 물주기 꿀팁', cafe: '플랜테리어', viewcnt: 764000, cmtcnt: 1500, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'plant/C/3' },
];
const PAGE = 20;
const emo = ['🔥', '📈', '🍳', '⚽', '🌱', '🐶', '🎬', '🛍️', '❄️', '🏕️'];
const pal: [string, string][] = [['#FFF1E6', '#FBE0C8'], ['#E8F0FF', '#D1E1FC'], ['#EAF7EE', '#D5EEDD'], ['#FCE7E9', '#F6D3D8'], ['#F0ECFB', '#DFD7F4']];
const rowThumb = (i: number) => emojiThumb(emo[i % emo.length], pal[i % pal.length][0], pal[i % pal.length][1]);

export function Retro() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [rows, setRows] = useState<ApiArticle[] | null>(null);
  const [aggdt, setAggdt] = useState('');
  const [mode, setMode] = useState<'live' | 'mock' | 'loading'>('loading');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setMode('loading'); setPage(1);
    const cands = period === 'weekly' ? weeklyAggdtCandidates() : monthlyAggdtCandidates();
    fetchPastArticles(period, cands, 300)
      .then((res) => { if (!alive) return; setRows(res.articles); setAggdt(res.aggdt); setMode(res.articles.length ? 'live' : 'mock'); })
      .catch(() => { if (alive) { setRows(null); setMode('mock'); } });
    return () => { alive = false; };
  }, [period]);

  const data = mode === 'live' && rows && rows.length ? rows : FALLBACK;
  const top = data.slice(0, 10);
  const rest = data.slice(10);
  const pageRows = useMemo(() => rest.slice((page - 1) * PAGE, page * PAGE), [rest, page]);
  const aggLabel = aggdt ? `${aggdt.slice(0, 4)}.${aggdt.slice(4, 6)}.${aggdt.slice(6, 8)} 집계` : '';

  return (
    <VStack gap={5}>
      <PageHeader title="주간 · 월간 인기글"
        meta={<>
          {mode === 'live' ? <HStack gap={1} vAlign="center"><StatusDot variant="success" isPulsing label="실데이터" /><Badge variant="green" label="실데이터 연동" /></HStack>
            : mode === 'loading' ? <Badge variant="neutral" label="불러오는 중…" />
            : <HStack gap={1} vAlign="center"><StatusDot variant="warning" label="샘플" /><Badge variant="yellow" label="샘플(폴백)" /></HStack>}
          <Badge variant="blue" label={`${data.length}건`} />
          {aggLabel && <Badge variant="neutral" label={aggLabel} />}
        </>}
        description={`/popular/${period}/articles — 배치 사전집계 인기글 (TOP10 + 전체 랭킹)`}
        actions={
          <SegmentedControl value={period} onChange={(v) => setPeriod(v as Period)} label="기간" size="md">
            <SegmentedControlItem value="weekly" label="주간" />
            <SegmentedControlItem value="monthly" label="월간" />
          </SegmentedControl>
        } />

      {mode === 'mock' && <Banner status="warning" title="샘플 데이터" description="사내망/프록시(/api) 미연결 상태입니다. 실데이터는 사내망에서 표시됩니다." />}

      {/* TOP 10 */}
      <VStack gap={2}>
        <Heading level={4}>{period === 'weekly' ? '주간' : '월간'} TOP 10</Heading>
        <Grid columns={{ minWidth: 300 }} gap={3}>
          {top.map((a, i) => (
            <Card key={a.permlink} padding={3}>
              <HStack gap={3} vAlign="center">
                <Heading level={3}>{i + 1}</Heading>
                <SmartThumb src={a.img} fallback={rowThumb(i)} alt={a.title} label={a.title} style={{ width: 56, height: 56 }} />
                <StackItem size="fill">
                  <VStack gap={0}>
                    <Text weight="medium" maxLines={2}>{a.title}</Text>
                    <HStack gap={2} wrap="wrap">
                      <Text type="supporting" color="accent">{a.cafe}</Text>
                      <Text type="supporting" color="secondary">👁 {fmt(a.viewcnt)}</Text>
                      <Text type="supporting" color="secondary">💬 {fmt(a.cmtcnt)}</Text>
                    </HStack>
                  </VStack>
                </StackItem>
              </HStack>
            </Card>
          ))}
        </Grid>
      </VStack>

      {/* 전체 랭킹 (11위~) */}
      {rest.length > 0 && (
        <VStack gap={2}>
          <HStack gap={2} vAlign="center"><Heading level={4}>전체 랭킹</Heading><Badge variant="neutral" label={`${rest.length}건`} /></HStack>
          <Card padding={0}>
            <VStack gap={0}>
              {pageRows.map((a, i) => (
                <Section key={a.permlink} padding={3}>
                  <HStack gap={3} vAlign="center">
                    <HStack width={40} justify="end"><Text weight="bold" color="secondary">{11 + (page - 1) * PAGE + i}</Text></HStack>
                    <SmartThumb src={a.img} fallback={rowThumb(i + 3)} alt={a.title} label={a.title} style={{ width: 40, height: 40 }} />
                    <StackItem size="fill"><Text weight="medium" maxLines={1}>{a.title}</Text></StackItem>
                    <Text type="supporting" color="accent">{a.cafe}</Text>
                    <HStack width={90} justify="end"><Text type="supporting" color="secondary">👁 {fmt(a.viewcnt)}</Text></HStack>
                    <HStack width={72} justify="end"><Text type="supporting" color="secondary">💬 {fmt(a.cmtcnt)}</Text></HStack>
                  </HStack>
                </Section>
              ))}
            </VStack>
          </Card>
          <HStack justify="center">
            <Pagination totalPages={Math.max(1, Math.ceil(rest.length / PAGE))} page={page} onChange={setPage} />
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
