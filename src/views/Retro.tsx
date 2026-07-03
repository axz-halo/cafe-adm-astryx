import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { List, ListItem } from '@astryxdesign/core/List';
import { Pagination } from '@astryxdesign/core/Pagination';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { PageHeader } from './PageHeader';
import { fmt, hash, emojiThumb, PASTEL } from './shared';

// ── 주간·월간 인기글 회고 (아티팩트 tr 모듈 이식 — TOP10 분리 + 320건 페이지네이션) ──
type Period = 'weekly' | 'monthly';
type Top = { emoji: string; title: string; cafe: string; cat: string; v: number; d: { t: 'keep' | 'up' | 'down' | 'new'; l?: string } };
const TOP10: Record<Period, Top[]> = {
  weekly: [
    { emoji: '🍳', title: '자취 5년차가 알려주는 진짜 쉬운 자취요리 10선', cafe: '요리하는 자취생', cat: '일상', v: 1248000, d: { t: 'keep' } },
    { emoji: '⚽', title: '어제 경기 미쳤다… 후반 막판 역전골 직관 후기', cafe: '축구사랑 모임', cat: '스포츠', v: 982000, d: { t: 'up', l: '320%' } },
    { emoji: '🌱', title: '초보도 안 죽이는 실내식물 추천 + 물주기 꿀팁', cafe: '플랜테리어', cat: '일상', v: 764000, d: { t: 'new' } },
    { emoji: '😄', title: '호텔키 반납을 깜빡한 사람.jpg', cafe: '여성시대', cat: '유머', v: 651000, d: { t: 'keep' } },
    { emoji: '🐱', title: '고양이가 처음 눈을 본 반응', cafe: '동물공감', cat: '동물', v: 542000, d: { t: 'up', l: '180%' } },
    { emoji: '🚗', title: '기아 셀토스 풀체인지 공개', cafe: '자동차 카페', cat: '정보', v: 489000, d: { t: 'down', l: '12%' } },
    { emoji: '🥊', title: '이번 주 격투기 판정 논란 정리', cafe: '이종격투기', cat: '스포츠', v: 410000, d: { t: 'up', l: '95%' } },
    { emoji: '🏟️', title: '손흥민 선제골 직캠', cafe: '樂soccer', cat: '스포츠', v: 385000, d: { t: 'up', l: '60%' } },
    { emoji: '🏀', title: '농구 플레이오프 마지막 슛 직캠', cafe: '樂basket', cat: '스포츠', v: 352000, d: { t: 'up', l: '80%' } },
    { emoji: '🍜', title: '편의점 라면 조합 끝판왕 정리', cafe: '자취생 모임', cat: '일상', v: 338000, d: { t: 'keep' } },
  ],
  monthly: [
    { emoji: '🍳', title: '자취 5년차가 알려주는 진짜 쉬운 자취요리 10선', cafe: '요리하는 자취생', cat: '일상', v: 4120000, d: { t: 'keep' } },
    { emoji: '🌱', title: '초보 실내식물 키우기 한 달 총정리', cafe: '플랜테리어', cat: '일상', v: 3510000, d: { t: 'up', l: '신규 급상승' } },
    { emoji: '🏟️', title: '6월 직관 명장면 모음.zip', cafe: '축구사랑 모임', cat: '스포츠', v: 3180000, d: { t: 'up', l: '140%' } },
    { emoji: '🛍️', title: '다이소 6월 신상 꿀템 30선', cafe: '살림의 여왕', cat: '정보', v: 2870000, d: { t: 'up', l: '95%' } },
    { emoji: '🐶', title: '강아지 입양 한 달, 솔직 후기', cafe: '동물공감', cat: '동물', v: 2540000, d: { t: 'keep' } },
    { emoji: '❄️', title: '에어컨 전기세 줄이는 현실 꿀팁', cafe: '살림정보', cat: '정보', v: 2330000, d: { t: 'up', l: '70%' } },
    { emoji: '🏖️', title: '올여름 휴가지 추천 BEST 10', cafe: '여행에 미치다', cat: '일상', v: 2110000, d: { t: 'keep' } },
    { emoji: '🏕️', title: '캠핑 입문 장비 이것만 사면 끝', cafe: '캠핑lovers', cat: '취미', v: 1980000, d: { t: 'new' } },
    { emoji: '🎬', title: '6월 본 영화 중 인생작 추천', cafe: '영화수다', cat: '취미', v: 1870000, d: { t: 'up', l: '55%' } },
    { emoji: '🥗', title: '여름 다이어트 한 달 식단 공유', cafe: '헬스타그램', cat: '일상', v: 1760000, d: { t: 'keep' } },
  ],
};
const META: Record<Period, { period: string; label: string; ttl: string; bullets: string[]; kw: [string, number][] }> = {
  weekly: {
    period: '2026.06.25 ~ 07.01', label: '이번 주', ttl: '이번 주는 일상·스포츠 콘텐츠가 인기글을 주도했어요.',
    bullets: [
      '주말 경기 영향으로 스포츠 직관·하이라이트 글이 급상승 — "역전골 직관 후기" ▲320%',
      "'자취요리'가 3주 연속 1위 — 생활밀착 콘텐츠가 꾸준히 강세",
      "신규 진입: '실내식물'(플랜테리어) 첫 TOP10 — 취미·홈가드닝 부상",
    ],
    kw: [['▲ #직관후기', 1], ['▲ #실내식물', 1], ['▲ #반려묘', 1], ['#자취요리', 0], ['#역전골', 0]],
  },
  monthly: {
    period: '2026.06.01 ~ 06.30', label: '이번 달', ttl: '6월은 생활·취미 콘텐츠가 한 달 내내 강세였어요.',
    bullets: [
      "'자취요리'가 6월 누적 1위 — 월간으로도 압도적",
      '홈가드닝·취미 글이 月 전반 급증 — 실내식물·다이소 꿀템 동반 상승',
      '스포츠는 주말마다 스파이크, 월 누적 3위권 유지',
    ],
    kw: [['▲ #홈가드닝', 1], ['▲ #다이소꿀템', 1], ['▲ #여름준비', 1], ['#자취요리', 0], ['#6월직관', 0]],
  },
};
// 나머지 310건 생성 풀 (아티팩트 TR_POOL 발췌)
const POOL: [string, string, string, string][] = [
  ['퇴근 후 10분 자취 레시피 모음', '일상', '🍳', '요리하는 자취생'], ['주말 직관 명장면 하이라이트', '스포츠', '⚽', '축구사랑 모임'],
  ['오늘의 웃긴 짤 모음.jpg', '유머', '😂', '유머나라'], ['우리집 강아지 자는 모습', '동물', '🐶', '멍멍이라이프'],
  ['가성비 노트북 추천 정리', '정보', '💻', 'IT라운지'], ['이번 주 드라마 결말 떡밥 정리', '연예', '📺', '드라마덕후'],
  ['입문자용 등산 코스 추천', '취미', '🥾', '산스장'], ['요즘 전세사기 예방 체크리스트', '사회', '📋', '부동산스터디'],
  ['에어프라이어 만능 레시피 30선', '일상', '🍗', '살림의 여왕'], ['국대 경기 리뷰 & 평점', '스포츠', '🏟️', '축구공화국'],
  ['고양이 집사 입문 꿀팁', '동물', '🐱', '냥집사클럽'], ['무지출 챌린지 일주일 후기', '일상', '💰', '짠테크모임'],
  ['신상 스마트폰 실사용 후기', '정보', '📱', '모바일포럼'], ['이번 시즌 최고의 직캠', '연예', '🎤', '아이돌팬'],
  ['홈카페 분위기 내는 법', '취미', '☕', '홈카페일기'], ['격투기 경기 판정 논쟁 정리', '스포츠', '🥊', '이종격투기'],
  ['초보 화분 키우기 실패담', '일상', '🪴', '플랜테리어'], ['웃참 실패하는 댓글 모음', '유머', '🤣', '개드립저장소'],
  ['중고차 살 때 꼭 보는 것', '정보', '🚗', '자동차 카페'],
];
const TOTAL = 320; // TOP10 + 310건
type Row = { r: number; title: string; cafe: string; cat: string; emoji: string; v: number };
const buildRest = (period: Period): Row[] =>
  Array.from({ length: TOTAL - 10 }, (_, i) => {
    const p = POOL[(i + hash(period)) % POOL.length];
    const mul = period === 'monthly' ? 3.3 : 1;
    return { r: i + 11, title: p[0], cat: p[1], emoji: p[2], cafe: p[3], v: Math.round(330000 * mul * Math.pow(0.988, i) * (0.8 + (hash(period + i) % 40) / 100)) };
  });

const deltaBadge = (d: Top['d']) =>
  d.t === 'new' ? <Badge variant="blue" label="NEW" /> : d.t === 'up' ? <Badge variant="green" label={`▲ ${d.l}`} /> : d.t === 'down' ? <Badge variant="red" label={`▼ ${d.l}`} /> : <Badge variant="neutral" label="유지" />;

export function Retro() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const meta = META[period];
  const rest = useMemo(() => buildRest(period), [period]);
  const pageRows = rest.slice((page - 1) * pageSize, page * pageSize);

  const thumbCell = (emoji: string, cat: string, title: string) => {
    const [c1, c2] = PASTEL[cat] ?? PASTEL['정보'];
    return <Thumbnail src={emojiThumb(emoji, c1, c2)} alt={title} label={title} style={{ width: 40, height: 40 }} />;
  };
  const topCols: TableColumn<Top & { r: number }>[] = [
    { key: 'r', header: '순위', width: pixel(56), renderCell: (a) => <Text weight="bold">{a.r}</Text> },
    { key: 'title', header: '게시글', width: proportional(1), renderCell: (a) => (
      <HStack gap={3} vAlign="center">{thumbCell(a.emoji, a.cat, a.title)}<VStack gap={0}><Text weight="medium" maxLines={1}>{a.title}</Text><Text type="supporting" color="secondary">{a.cafe}</Text></VStack></HStack>
    ) },
    { key: 'cat', header: '카테고리', width: pixel(90), renderCell: (a) => <Badge variant="neutral" label={a.cat} /> },
    { key: 'v', header: '조회수', width: pixel(90), align: 'end', renderCell: (a) => <Text type="supporting">{fmt(a.v)}</Text> },
    { key: 'd', header: '전기간 대비', width: pixel(120), align: 'end', renderCell: (a) => deltaBadge(a.d) },
  ];
  const restCols: TableColumn<Row>[] = [
    { key: 'r', header: '순위', width: pixel(56), renderCell: (a) => <Text weight="bold">{a.r}</Text> },
    { key: 'title', header: '게시글', width: proportional(1), renderCell: (a) => (
      <HStack gap={3} vAlign="center">{thumbCell(a.emoji, a.cat, a.title)}<VStack gap={0}><Text weight="medium" maxLines={1}>{a.title}</Text><Text type="supporting" color="secondary">{a.cafe}</Text></VStack></HStack>
    ) },
    { key: 'cat', header: '카테고리', width: pixel(90), renderCell: (a) => <Badge variant="neutral" label={a.cat} /> },
    { key: 'v', header: '조회수', width: pixel(90), align: 'end', renderCell: (a) => <Text type="supporting">{fmt(a.v)}</Text> },
  ];

  return (
    <VStack gap={5}>
      <PageHeader
        title="주간 · 월간 인기글"
        meta={<Badge variant="neutral" label={meta.period} />}
        description={`${meta.label} 인기글 회고 · 노출 이력 전체 ${TOTAL}건 · TOP 10 별도 구분`}
        actions={
          <SegmentedControl value={period} onChange={(v) => { setPeriod(v as Period); setPage(1); }} label="기간" size="md">
            <SegmentedControlItem value="weekly" label="주간" />
            <SegmentedControlItem value="monthly" label="월간" />
          </SegmentedControl>
        }
      />

      <Card padding={5}>
        <VStack gap={3}>
          <Heading level={4}>🤖 AI 트렌드 요약</Heading>
          <Text weight="medium">{meta.ttl}</Text>
          <List listStyle="disc" density="compact">
            {meta.bullets.map((b, i) => <ListItem key={i} label={b} />)}
          </List>
          <HStack gap={2} wrap="wrap">
            {meta.kw.map(([k, hot]) => <Badge key={k} variant={hot ? 'green' : 'neutral'} label={k} />)}
          </HStack>
        </VStack>
      </Card>

      <VStack gap={2}>
        <HStack gap={2} vAlign="center"><Heading level={4}>🏆 전체 TOP 10</Heading><Text type="supporting" color="secondary">조회수 기준</Text></HStack>
        <Card padding={0}>
          <Table<Top & { r: number }> data={TOP10[period].map((t, i) => ({ ...t, r: i + 1 }))} columns={topCols} idKey="r" density="balanced" dividers="rows" hasHover />
        </Card>
      </VStack>

      <VStack gap={2}>
        <HStack gap={2} vAlign="center"><Heading level={4}>전체 목록</Heading><Text type="supporting" color="secondary">11위 ~ {TOTAL}위 · 순서대로 보기</Text></HStack>
        <Card padding={0}>
          <VStack gap={0}>
            <Table<Row> data={pageRows} columns={restCols} idKey="r" density="balanced" dividers="rows" hasHover />
            <HStack justify="center">
              <VStack gap={0}>
                <Pagination page={page} onChange={setPage} totalItems={TOTAL - 10} pageSize={pageSize}
                  pageSizeOptions={[20, 50, 100]} onPageSizeChange={setPageSize} variant="pages" size="md" />
              </VStack>
            </HStack>
          </VStack>
        </Card>
      </VStack>
    </VStack>
  );
}
