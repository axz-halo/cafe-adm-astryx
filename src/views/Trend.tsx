import { Fragment, useMemo, useState } from 'react';
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
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { PageHeader } from './PageHeader';
import { fmt, hash, emojiThumb } from './shared';

// ── 카페 트렌드 (프로토타입 kwt 모듈과 동일 구조) ──
// 헤더(기간 탭) → 시간대 셀렉터+데이터 메타 → 증감 기준 배너 → [트렌드 검색어 | 위험 키워드 관리] 2컬럼
type Period = 'realtime' | 'weekly' | 'monthly';
type Word = { w: string; m: number; d: number | 'new' };
const KWT: Record<Period, { label: string; meta: string; words: Word[] }> = {
  realtime: { label: '실시간', meta: '2026-07-02 10시', words: [
    { w: '배재고', m: 14132, d: 'new' }, { w: '홍명보', m: 20544, d: -8 }, { w: '하닉', m: 18982, d: 42 }, { w: '코르티스', m: 6219, d: 'new' },
    { w: '안경만두', m: 3357, d: 'new' }, { w: '삼전', m: 5299, d: 'new' }, { w: '김부장', m: 3747, d: 15 }, { w: '미나미', m: 4115, d: -3 },
    { w: '하이닉스', m: 4057, d: 'new' }, { w: '마운자로', m: 3316, d: 120 }, { w: '사인클', m: 2208, d: 'new' }, { w: '손흥민', m: 3052, d: 30 },
    { w: '이재명', m: 5787, d: 'new' }, { w: '에스파', m: 2640, d: 18 }, { w: '야구', m: 2251, d: 12 }, { w: '광주일고', m: 1800, d: 'new' },
    { w: '셀토스', m: 1980, d: 64 }, { w: '실내식물', m: 1530, d: 'new' }, { w: '자취요리', m: 2890, d: 9 }, { w: '직관후기', m: 2100, d: 88 },
  ]},
  weekly: { label: '주간', meta: '2026.06.25 ~ 07.01', words: [
    { w: '자취요리', m: 128400, d: 12 }, { w: '직관후기', m: 98200, d: 320 }, { w: '실내식물', m: 76400, d: 'new' }, { w: '손흥민', m: 65100, d: 40 },
    { w: '다이소꿀템', m: 58900, d: 55 }, { w: '여름휴가', m: 52000, d: 28 }, { w: '에어컨', m: 48500, d: 70 }, { w: '강아지입양', m: 41000, d: 15 },
    { w: '캠핑', m: 38000, d: 33 }, { w: '다이어트', m: 35200, d: -5 }, { w: '홈카페', m: 31000, d: 22 }, { w: '역전골', m: 29000, d: 140 },
  ]},
  monthly: { label: '월간', meta: '2026.06.01 ~ 06.30', words: [
    { w: '자취요리', m: 412000, d: 8 }, { w: '홈가드닝', m: 351000, d: 'new' }, { w: '다이소꿀템', m: 318000, d: 95 }, { w: '6월직관', m: 287000, d: 140 },
    { w: '여름준비', m: 254000, d: 60 }, { w: '실내식물', m: 233000, d: 120 }, { w: '캠핑', m: 211000, d: 30 }, { w: '에어컨', m: 198000, d: 70 },
    { w: '다이어트', m: 176000, d: -3 }, { w: '휴가지추천', m: 165000, d: 45 },
  ]},
};
const HOURS = ['2026-07-02 10시', '2026-07-02 09시', '2026-07-02 08시', '2026-07-01 22시'];
const INITIAL_BLACK = ['이재명', '윤석렬', '국민의힘', '국짐', '유시민', '정청래', '줄리', '국힘'];
const EMO: [string, string, string][] = [
  ['📰', '#EAF0F7', '#D3E2F0'], ['🔥', '#FFF1E6', '#FBE0C8'], ['💬', '#FCE7E9', '#F6D3D8'], ['📸', '#F0ECFB', '#DFD7F4'],
  ['⚡', '#FBF3D9', '#F3E7B9'], ['🎬', '#E8F0FF', '#D1E1FC'], ['📝', '#EAF7EE', '#D5EEDD'], ['❗', '#FDEAF0', '#F6D3E0'],
];
// 키워드별 인기글 생성 (프로토타입 kwtArticles 동일 로직 — 결정적)
const kwArticles = (w: string) => {
  const tmpl = [`지금 난리난 ${w} 정리.jpg`, `실시간 ${w} 떡밥 모음`, `${w} 보고 충격받은 후기`, `${w} 관련 댓글 반응 모음`, `${w} 이거 실화냐?`, `오늘자 ${w} 핵심 요약`, `${w} 직관 실시간 후기`, `${w} 둘러보고 옴.txt`, `${w} 근황 총정리`, `${w} 갑론을박 모음`];
  const cafes = ['여성시대', '이종격투기', '도탁스', '樂soccer', '유머나라', '엽기혹은진실'];
  const h = hash(w);
  return Array.from({ length: 10 }, (_, i) => {
    const v = Math.round(280000 * Math.pow(0.85, i) * (0.7 + (hash(w + '#' + i) % 60) / 100));
    const e = EMO[(h + i) % EMO.length];
    return { title: tmpl[i % tmpl.length], cafe: cafes[(h + i) % cafes.length], views: v, comments: Math.round(v / (18 + i * 4)), emoji: e[0], c1: e[1], c2: e[2] };
  });
};

// 기간별 유행 요약 (실서비스에선 LLM 요약 자리)
const TREND_SUMMARY: Record<Period, { headline: string; points: string[] }> = {
  realtime: { headline: '지금은 스포츠·반도체 이슈가 실시간 트렌드를 주도하고 있어요.', points: ['홍명보 감독 발탁 논란으로 축구 관련 언급 급증(▼ 조정 국면)', '하닉·삼전 등 반도체주가 실시간 화제로 신규 진입', '이번 시간대 신규 진입 키워드 8개 — 배재고·코르티스·안경만두 등'] },
  weekly: { headline: '이번 주는 생활·스포츠 콘텐츠가 인기 검색을 이끌었어요.', points: ['자취요리가 주간 언급 1위 유지 — 생활밀착 콘텐츠 강세', '주말 경기 영향으로 직관후기 ▲320% 급상승', '실내식물(플랜테리어)이 주간 트렌드에 첫 진입'] },
  monthly: { headline: '6월은 생활·취미 콘텐츠가 한 달 내내 강세였어요.', points: ['자취요리가 월간 누적 1위 — 압도적', '홈가드닝·다이소꿀템이 동반 급상승', '캠핑·여름준비 등 시즌 키워드가 월말로 갈수록 부상'] },
};

// 고정폭 컬럼 규격 — 모든 행이 동일 그리드에 정렬되도록
const COL = { rank: 36, mention: 90, delta: 90, actions: 168 } as const;

export function Trend() {
  const [period, setPeriod] = useState<Period>('realtime');
  const [hour, setHour] = useState(HOURS[0]);
  const [black, setBlack] = useState<string[]>(INITIAL_BLACK);
  const [sel, setSel] = useState<string | null>(null);
  const [sort, setSort] = useState<'views' | 'comments'>('views');
  const [newKw, setNewKw] = useState('');

  const words = useMemo(() => KWT[period].words.filter((o) => !black.includes(o.w)), [period, black]);
  const removed = black.length; // 프로토타입 동일: 등록된 위험 키워드 수
  const metaLabel = period === 'realtime' ? hour : KWT[period].meta;
  const basis = period === 'realtime' ? '직전 시간대(1시간 전)' : period === 'weekly' ? '전주 동일 기간' : '전월 동일 기간';

  const addBlack = () => { const v = newKw.trim(); if (v && !black.includes(v)) setBlack((b) => [...b, v]); setNewKw(''); };
  const removeKw = (w: string) => { setBlack((b) => (b.includes(w) ? b : [...b, w])); if (sel === w) setSel(null); };

  const delta = (d: number | 'new') =>
    d === 'new' ? <Badge variant="blue" label="NEW" /> : d > 0 ? <Badge variant="green" label={`▲ ${d}%`} /> : d < 0 ? <Badge variant="red" label={`▼ ${Math.abs(d as number)}%`} /> : <Text type="supporting" color="secondary">–</Text>;

  const headerCell = (label: string, width?: number, end = false) => (
    width
      ? <HStack width={width} justify={end ? 'end' : 'start'}><Text type="label" color="secondary">{label}</Text></HStack>
      : <StackItem size="fill"><Text type="label" color="secondary">{label}</Text></StackItem>
  );

  return (
    <VStack gap={5}>
      <PageHeader
        title="카페 트렌드"
        description="실시간·주간·월간 급상승 검색 키워드"
        actions={
          <SegmentedControl value={period} onChange={(v) => { setPeriod(v as Period); setSel(null); }} label="기간" size="md">
            <SegmentedControlItem value="realtime" label="실시간" />
            <SegmentedControlItem value="weekly" label="주간" />
            <SegmentedControlItem value="monthly" label="월간" />
          </SegmentedControl>
        }
      />

      {/* 시간대 셀렉터 + 데이터 메타 */}
      <HStack gap={3} vAlign="center" wrap="wrap">
        <HStack gap={2} vAlign="center">
          <Text type="supporting" color="secondary">시간대</Text>
          {period === 'realtime'
            ? <Selector label="시간대" isLabelHidden size="md" options={HOURS} value={hour} onChange={(v) => v && setHour(v)} />
            : <Badge variant="neutral" label={KWT[period].meta} />}
        </HStack>
        <StackItem size="fill"><HStack justify="end"><Text type="supporting" color="secondary">마지막 확인 데이터 <Text as="span" type="supporting" weight="semibold">{metaLabel}</Text> · 노출 시작 <Text as="span" type="supporting" weight="semibold">{metaLabel}</Text></Text></HStack></StackItem>
      </HStack>

      {/* 유행 요약 + 대표 인기글 매핑 */}
      <Card padding={5} variant="purple">
        <VStack gap={3}>
          <HStack gap={2} vAlign="center" wrap="wrap"><Badge variant="purple" label="AI 요약" /><Text weight="semibold">{TREND_SUMMARY[period].headline}</Text></HStack>
          <List listStyle="disc" density="compact">
            {TREND_SUMMARY[period].points.map((p, i) => <ListItem key={i} label={p} />)}
          </List>
          <Divider />
          <Text type="label">대표 인기글 — 상위 키워드별 최고 조회글</Text>
          <Grid columns={{ minWidth: 300 }} gap={3}>
            {words.slice(0, 3).map((o) => {
              const top = kwArticles(o.w)[0];
              return (
                <Card key={o.w} padding={3}>
                  <HStack gap={3} vAlign="center">
                    <Thumbnail src={emojiThumb(top.emoji, top.c1, top.c2)} alt={top.title} label={top.title} style={{ width: 48, height: 48 }} />
                    <VStack gap={0}>
                      <HStack gap={1} vAlign="center"><Badge variant="blue" label={`#${o.w}`} />{o.d !== 'new' && o.d > 0 && <Badge variant="green" label={`▲ ${o.d}%`} />}</HStack>
                      <Text weight="medium" maxLines={1}>{top.title}</Text>
                      <Text type="supporting" color="secondary">{top.cafe} · 👁 {fmt(top.views)}</Text>
                    </VStack>
                  </HStack>
                </Card>
              );
            })}
          </Grid>
        </VStack>
      </Card>

      {/* 증감 기준 안내 배너 */}
      <Banner status="info" title="증감 기준"
        description={`증감은 ${basis} 언급량 대비입니다. NEW는 이번 ${period === 'realtime' ? '시간대' : '기간'}에 처음 진입한 키워드.`} />

      {/* 2컬럼: 트렌드 검색어 | 위험 키워드 관리 */}
      <HStack gap={4} vAlign="start" wrap="wrap">
        <StackItem size="fill">
          <Card padding={0}>
            <Section padding={4}>
              <HStack gap={2} vAlign="center">
                <Heading level={4}>트렌드 검색어</Heading>
                <Text type="supporting" color="secondary">노출 {words.length}개 · 위험 제외 {removed}개</Text>
              </HStack>
            </Section>
            <Divider />
            <Section padding={3}>
              <HStack gap={3} vAlign="center">
                {headerCell('순위', COL.rank)}
                {headerCell('검색어')}
                {headerCell('언급량', COL.mention, true)}
                {headerCell('증감', COL.delta, true)}
                {headerCell('관리', COL.actions, true)}
              </HStack>
            </Section>
            {words.map((o, i) => {
              const isOpen = sel === o.w;
              const arts = isOpen ? [...kwArticles(o.w)].sort((a, b) => (sort === 'comments' ? b.comments - a.comments : b.views - a.views)) : [];
              return (
                <Fragment key={o.w}>
                  <Divider />
                  <Section padding={3}>
                    <HStack gap={3} vAlign="center">
                      <HStack width={COL.rank}><Text weight="bold" color="secondary">{i + 1}</Text></HStack>
                      <StackItem size="fill"><Text weight="medium">{o.w}</Text></StackItem>
                      <HStack width={COL.mention} justify="end"><Text type="supporting">{fmt(o.m)}</Text></HStack>
                      <HStack width={COL.delta} justify="end">{delta(o.d)}</HStack>
                      <HStack width={COL.actions} justify="end" gap={2}>
                        <Button label={isOpen ? '닫기' : '인기글'} variant={isOpen ? 'secondary' : 'ghost'} size="sm" onClick={() => setSel(isOpen ? null : o.w)} />
                        <Button label="제거" variant="secondary" size="sm" onClick={() => removeKw(o.w)} />
                      </HStack>
                    </HStack>
                  </Section>
                  {isOpen && (
                    <Section variant="muted" padding={4}>
                      <VStack gap={3}>
                        <HStack gap={2} vAlign="center">
                          <StackItem size="fill"><Text weight="bold">🔥 “{o.w}” 인기글 TOP 10</Text></StackItem>
                          <SegmentedControl value={sort} onChange={(v) => setSort(v as never)} label="정렬" size="sm">
                            <SegmentedControlItem value="views" label="조회순" />
                            <SegmentedControlItem value="comments" label="댓글순" />
                          </SegmentedControl>
                        </HStack>
                        <Grid columns={{ minWidth: 250 }} gap={3}>
                          {arts.map((a, j) => (
                            <Card key={j} padding={3}>
                              <HStack gap={3} vAlign="center">
                                <Text weight="bold" color="secondary">{j + 1}</Text>
                                <Thumbnail src={emojiThumb(a.emoji, a.c1, a.c2)} alt={a.title} label={a.title} style={{ width: 48, height: 48 }} />
                                <VStack gap={0}>
                                  <Text weight="medium" maxLines={1}>{a.title}</Text>
                                  <HStack gap={2}><Text type="supporting" color="accent">{a.cafe}</Text><Text type="supporting" color="secondary">👁 {fmt(a.views)} · 💬 {fmt(a.comments)}</Text></HStack>
                                </VStack>
                              </HStack>
                            </Card>
                          ))}
                        </Grid>
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
            <HStack gap={2} vAlign="center"><Heading level={4}>위험 키워드 관리</Heading><Text type="supporting" color="secondary">트렌드에서 제외</Text></HStack>
            <HStack gap={2} vAlign="center">
              <StackItem size="fill"><TextInput label="위험 키워드 추가" isLabelHidden size="sm" value={newKw} onChange={setNewKw} /></StackItem>
              <Button label="추가" variant="secondary" size="sm" onClick={addBlack} />
            </HStack>
            <HStack gap={2} wrap="wrap">
              {black.map((w) => <Token key={w} label={w} color="red" size="sm" onRemove={() => setBlack((b) => b.filter((x) => x !== w))} />)}
            </HStack>
          </VStack>
        </Card>
      </HStack>
    </VStack>
  );
}
