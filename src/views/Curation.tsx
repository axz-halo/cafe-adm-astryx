import { useEffect, useMemo, useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Selector } from '@astryxdesign/core/Selector';
import { SmartThumb } from '../SmartThumb';
import { Banner } from '@astryxdesign/core/Banner';
import { PageHeader } from './PageHeader';
import { fmt, emojiThumb } from './shared';
import { fetchCategoryArticles, type ApiCategory } from '../api';

// ── 카테고리 인기글 (실데이터: GET /popular/categorized/article/{y}/{m}/{d}) ──
// 서비스 카테고리별 대표 인기글을 조회·검수·노출. 실패 시 샘플로 폴백.

const FALLBACK: ApiCategory[] = [
  { id: 1, name: '일상/라이프', articles: [
    { title: '자취 5년차가 알려주는 진짜 쉬운 자취요리 10선', cafe: '요리하는 자취생', grpcode: 'cook', fldid: 'A', dataid: 1, img: '', viewCount: 128400, commentCount: 320, url: '#' },
    { title: '다이소 신상 꿀템 정리', cafe: '살림의 여왕', grpcode: 'life', fldid: 'B', dataid: 2, img: '', viewCount: 98200, commentCount: 210, url: '#' },
  ] },
  { id: 2, name: '연예/엔터', articles: [
    { title: '아이돌 컴백 무대 직캠 모음', cafe: '덕질하는사람들', grpcode: 'fan', fldid: 'C', dataid: 3, img: '', viewCount: 623100, commentCount: 765, url: '#' },
  ] },
  { id: 3, name: '스포츠', articles: [
    { title: '어제 경기 역전골 직관 후기', cafe: '축구사랑', grpcode: 'soc', fldid: 'D', dataid: 4, img: '', viewCount: 98200, commentCount: 540, url: '#' },
  ] },
];

const CAT_EMOJI: Record<string, string> = {
  '연예/엔터': '🎬', '동물/자연': '🐶', '흥미/유머': '😄', '일상/라이프': '🏠',
  '스포츠': '⚽', '정보/팁': '💡', '경제/재테크': '📈', '정치/시사': '📰',
};
const catThumb = (name: string, i: number) => {
  const palette: [string, string][] = [['#EAF0F7', '#D3E2F0'], ['#FCE7E9', '#F6D3D8'], ['#EAF7EE', '#D5EEDD'], ['#FFF1E6', '#FBE0C8'], ['#F0ECFB', '#DFD7F4']];
  const [c1, c2] = palette[i % palette.length];
  return emojiThumb(CAT_EMOJI[name] ?? '📌', c1, c2);
};

// 최근 배치가 있는 날짜 후보 (오늘부터 역순)
function dayCandidates(now = new Date()): { label: string; y: number; m: number; d: number }[] {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(now); dt.setDate(dt.getDate() - i);
    out.push({ label: `${dt.getMonth() + 1}/${dt.getDate()}`, y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() });
  }
  return out;
}

export function Curation() {
  const days = useMemo(() => dayCandidates(), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [cats, setCats] = useState<ApiCategory[] | null>(null);
  const [mode, setMode] = useState<'live' | 'mock' | 'loading'>('loading');
  const [exposed, setExposed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    setMode('loading');
    const { y, m, d } = days[dayIdx];
    fetchCategoryArticles(y, m, d, 12, 12)
      .then((res) => { if (!alive) return; setCats(res); setMode(res.length ? 'live' : 'mock'); })
      .catch(() => { if (alive) { setCats(null); setMode('mock'); } });
    return () => { alive = false; };
  }, [dayIdx, days]);

  const data = mode === 'live' && cats && cats.length ? cats : FALLBACK;
  const totalArticles = data.reduce((n, c) => n + c.articles.length, 0);
  const key = (grpcode: string, dataid: number) => `${grpcode}/${dataid}`;

  return (
    <VStack gap={5}>
      <PageHeader title="카테고리 인기글"
        meta={<>
          {mode === 'live' ? <HStack gap={1} vAlign="center"><StatusDot variant="success" isPulsing label="실데이터" /><Badge variant="green" label="실데이터 연동" /></HStack>
            : mode === 'loading' ? <Badge variant="neutral" label="불러오는 중…" />
            : <HStack gap={1} vAlign="center"><StatusDot variant="warning" label="샘플" /><Badge variant="yellow" label="샘플(폴백)" /></HStack>}
          <Badge variant="blue" label={`${data.length}개 카테고리`} />
          <Badge variant="neutral" label={`${totalArticles}건`} />
        </>}
        description="/popular/categorized/article — 서비스 카테고리별 대표 인기글 (Cafe-Top 노출용)"
        actions={
          <Selector label="일자" isLabelHidden size="md" options={days.map((d, i) => ({ value: String(i), label: `${d.label}${i === 0 ? ' (오늘)' : ''}` }))}
            value={String(dayIdx)} onChange={(v) => v && setDayIdx(Number(v))} />
        } />

      {mode === 'mock' && <Banner status="warning" title="샘플 데이터" description="이 페이지는 사내망 API(/api)에 연결되지 않아 샘플로 표시됩니다. 실데이터는 사내망에 배포된 서버(예: :8080)로 접속하세요." />}

      {data.map((cat, ci) => (
        <VStack gap={2} key={cat.id}>
          <HStack gap={2} vAlign="center">
            <Heading level={4}>{cat.name}</Heading>
            <Badge variant="neutral" label={`${cat.articles.length}건`} />
          </HStack>
          <Grid columns={{ minWidth: 280 }} gap={3}>
            {cat.articles.map((a) => {
              const k = key(a.grpcode, a.dataid);
              const on = !!exposed[k];
              return (
                <Card key={k} padding={4}>
                  <VStack gap={3} height="100%">
                    <SmartThumb src={a.img} fallback={catThumb(cat.name, ci)} alt={a.title} label={a.title} onClick={() => a.url && a.url !== "#" && window.open(a.url, "_blank")} style={{ width: "100%", height: "auto" }} />
                    <StackItem size="fill">
                      <VStack gap={1}>
                        <Text weight="medium" maxLines={2}>{a.title}</Text>
                        <HStack gap={2} wrap="wrap">
                          <Text type="supporting" color="accent">{a.cafe}</Text>
                          <Text type="supporting" color="secondary">👁 {fmt(a.viewCount)}</Text>
                          <Text type="supporting" color="secondary">💬 {fmt(a.commentCount)}</Text>
                        </HStack>
                      </VStack>
                    </StackItem>
                    <Button label={on ? '노출완료' : '노출하기'} variant={on ? 'secondary' : 'primary'} size="sm"
                      onClick={() => setExposed((s) => ({ ...s, [k]: !s[k] }))} />
                  </VStack>
                </Card>
              );
            })}
          </Grid>
        </VStack>
      ))}
    </VStack>
  );
}
