import { useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Token } from '@astryxdesign/core/Token';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Divider } from '@astryxdesign/core/Divider';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { PageHeader } from './PageHeader';

// ── 준비 중이던 12개 섹션 — cafe-adm 실코드 분석 기반 재구성 ──
// 기존 어드민의 분산 메뉴를 통합하고, 이미 만든 패턴(칩/테이블+검색/큐/배포이력)을 재사용

type BadgeVariant = 'neutral' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'cyan' | 'success';

/* 1. 금칙어 · 규제 키워드 — 기존 /word/** 3종 + popular_ban_keyword 통합 */
const WORD_TABS = [
  { key: 'block', label: '차단어', desc: 'BlockWord — 게시글·댓글 작성 차단', color: 'red' as const, init: ['도박', '불법대출', '성인광고', '사기링크', '토토'] },
  { key: 'white', label: '화이트 워드', desc: 'WhiteWord — 차단 예외 허용', color: 'green' as const, init: ['보드게임', '슬롯머신(완구)', '경마장(지명)'] },
  { key: 'cond', label: '조건부 차단어', desc: 'ConditionBlockWord — 조건 충족 시만 차단', color: 'yellow' as const, init: ['광고 · 제목만', '홍보 · 링크 포함 시', '판매 · 비회원 작성 시'] },
  { key: 'popular', label: '인기글 규제', desc: 'popular_ban_keyword — 인기글 노출 제외', color: 'purple' as const, init: ['이재명', '윤석렬', '국민의힘', '국짐', '유시민', '정청래', '줄리', '국힘'] },
];
export function Words() {
  const [tab, setTab] = useState('block');
  const [words, setWords] = useState<Record<string, string[]>>(Object.fromEntries(WORD_TABS.map((t) => [t.key, t.init])));
  const [input, setInput] = useState('');
  const [sim, setSim] = useState('무료 쿠폰 도박 사이트 → bit.ly/deal');
  const [deploy, setDeploy] = useState<'draft' | 'review' | 'live'>('live');
  const [dirty, setDirty] = useState(false);
  const cur = WORD_TABS.find((t) => t.key === tab)!;
  const add = () => { const v = input.trim(); if (v && !words[tab].includes(v)) { setWords((w) => ({ ...w, [tab]: [...w[tab], v] })); setDirty(true); setDeploy('draft'); } setInput(''); };
  const remove = (w: string) => { setWords((s) => ({ ...s, [tab]: s[tab].filter((x) => x !== w) })); setDirty(true); setDeploy('draft'); };

  // 룰 시뮬레이터 — 차단어 매칭 + 화이트 예외 + AI 판별 병렬 (기존 "금칙어 테스트" 페이지 대체)
  const t = sim.replace(/\s/g, '');
  const matched = words.block.filter((w) => t.includes(w.replace(/\s/g, '')));
  const excepted = words.white.filter((w) => sim.includes(w.split('(')[0]));
  const hasLink = /https?:|bit\.ly|\.com/i.test(sim);
  const aiScore = Math.min(99, matched.length * 40 + (hasLink ? 25 : 0) + (/무료|대박|지금/.test(sim) ? 15 : 0));
  const aiLabel = aiScore >= 80 ? '차단 권고' : aiScore >= 50 ? '검수 권고' : '정상 추정';

  return (
    <VStack gap={5}>
      <PageHeader title="금칙어 · 규제 키워드" description="기존 4개 분산 메뉴(차단어/화이트/조건부/인기글 규제) 통합 — '바로적용' 대신 draft → 리뷰 → 반영 버전 배포"
        actions={
          <SegmentedControl value={tab} onChange={setTab} label="유형" size="md">
            {WORD_TABS.map((t) => <SegmentedControlItem key={t.key} value={t.key} label={`${t.label} ${words[t.key].length}`} />)}
          </SegmentedControl>
        } />
      <Card padding={5}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center"><Heading level={4}>{cur.label}</Heading><Text type="supporting" color="secondary">{cur.desc}</Text></HStack>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill"><TextInput label="키워드 추가" isLabelHidden size="sm" value={input} onChange={setInput} /></StackItem>
            <Button label="추가" variant="secondary" size="sm" onClick={add} />
          </HStack>
          <HStack gap={2} wrap="wrap">
            {words[tab].map((w) => <Token key={w} label={w} color={cur.color} size="sm" onRemove={() => remove(w)} />)}
          </HStack>
        </VStack>
      </Card>

      {/* 룰 시뮬레이터 — 매칭 룰 + AI 판별 병렬 (기존 /word/block/testingBlockWord 대체) */}
      <Card padding={5}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center"><Heading level={4}>룰 시뮬레이터</Heading><Text type="supporting" color="secondary">임의 텍스트로 차단 여부 사전 확인</Text></HStack>
          <TextInput label="테스트 텍스트" isLabelHidden size="md" value={sim} onChange={setSim} placeholder="차단 여부를 확인할 문장 입력" />
          <Grid columns={{ minWidth: 260 }} gap={3}>
            <Card padding={4}>
              <VStack gap={2}>
                <Text type="label">룰 매칭</Text>
                {matched.length === 0
                  ? <Text type="supporting" color="secondary">매칭된 차단어 없음</Text>
                  : <HStack gap={2} wrap="wrap">{matched.map((w) => <Token key={w} label={w} color="red" size="sm" />)}</HStack>}
                {excepted.length > 0 && <Text type="supporting" color="secondary">화이트 예외: {excepted.join(', ')}</Text>}
              </VStack>
            </Card>
            <Card padding={4}>
              <VStack gap={2}>
                <HStack gap={2} vAlign="center"><Text type="label">AI 판별</Text><Badge variant={aiScore >= 80 ? 'red' : aiScore >= 50 ? 'yellow' : 'green'} label={`AI ${aiScore} · ${aiLabel}`} /></HStack>
                <Text type="supporting" color="secondary">룰 매칭과 AI 판별이 불일치하면 검수 큐로 보냅니다.</Text>
              </VStack>
            </Card>
          </Grid>
        </VStack>
      </Card>

      {/* 배포 상태 — "바로적용" 수동 버튼 대체 */}
      <Card padding={4}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Badge variant={deploy === 'live' ? 'success' : deploy === 'review' ? 'yellow' : 'neutral'} label={deploy === 'live' ? '반영됨' : deploy === 'review' ? '리뷰 중' : '초안(draft)'} />
          <StackItem size="fill"><Text type="supporting" color="secondary">{dirty ? '미반영 변경 있음 — 리뷰어 1인 승인 후 반영 · 90일 diff 보관 · 롤백 가능' : '모든 변경이 반영된 상태입니다'}</Text></StackItem>
          {deploy === 'draft' && <Button label="리뷰 요청" variant="secondary" size="sm" onClick={() => setDeploy('review')} />}
          {deploy === 'review' && <Button label="반영 (승인 완료)" variant="primary" size="sm" onClick={() => { setDeploy('live'); setDirty(false); }} />}
          {deploy === 'live' && dirty === false && <Button label="롤백" variant="ghost" size="sm" onClick={() => setDeploy('draft')} />}
        </HStack>
      </Card>
    </VStack>
  );
}

/* 2. 노출제외 · 블랙 관리 — popular_ban_article/cafe/user/ip 4테이블 통합 */
type BanRow = { id: string; target: string; detail: string; reason: string; by: string; at: string };
const BAN_INIT: Record<string, BanRow[]> = {
  article: [
    { id: 'a1', target: '테일러 스위프트 결혼식으로 인해 통제…', detail: '여성시대 · ReHf/512', reason: '신고 누적(1건) · 검수 모드 처리', by: 'halo.wave', at: '07-02 10:12' },
    { id: 'a2', target: '원-달러 1,550원 돌파 직전 상황', detail: '홀리건 천국', reason: '규제 키워드 감지', by: '시스템', at: '07-02 09:00' },
    { id: 'a3', target: '구) 엘렌페이지 근황', detail: '도탁스', reason: '권리침해 신고', by: '박검수', at: '07-01 18:22' },
  ],
  cafe: [
    { id: 'c1', target: '알 수 없는 카페', detail: 'grpcode: unknown99', reason: '도배성 게시글 반복', by: '김운영', at: '06-28' },
    { id: 'c2', target: '성인모임방', detail: 'grpcode: adult0x', reason: '성인 콘텐츠', by: '최관리', at: '06-15' },
  ],
  user: [
    { id: 'u1', target: 'spam_bot_**', detail: '여성시대 외 3개 카페', reason: '자동화 도배', by: '시스템', at: '07-01' },
    { id: 'u2', target: 'malware_**', detail: '도탁스', reason: '악성 링크 유포', by: '박검수', at: '06-30' },
  ],
  ip: [
    { id: 'i1', target: '203.0.113.*', detail: '대역 차단', reason: '크롤링 봇', by: '시스템', at: '06-25' },
  ],
};
export function BlockList() {
  const [tab, setTab] = useState('article');
  const [rows, setRows] = useState(BAN_INIT);
  const cols: TableColumn<BanRow>[] = [
    { key: 'target', header: '대상', width: proportional(1), renderCell: (r) => <VStack gap={0}><Text weight="medium" maxLines={1}>{r.target}</Text><Text type="supporting" color="secondary">{r.detail}</Text></VStack> },
    { key: 'reason', header: '사유', width: pixel(200), renderCell: (r) => <Text type="supporting">{r.reason}</Text> },
    { key: 'by', header: '등록', width: pixel(140), renderCell: (r) => <Text type="supporting" color="secondary">{r.by} · {r.at}</Text> },
    { key: 'act', header: '관리', width: pixel(80), align: 'end', renderCell: (r) => <Button label="해제" variant="secondary" size="sm" onClick={() => setRows((s) => ({ ...s, [tab]: s[tab].filter((x) => x.id !== r.id) }))} /> },
  ];
  const LABEL: Record<string, string> = { article: '게시글', cafe: '카페 · 게시판', user: '회원', ip: 'IP' };
  return (
    <VStack gap={5}>
      <PageHeader title="노출제외 · 블랙 관리" description="기존 5개 분산 메뉴 통합 — 검수 모드에서 '노출제외' 처리한 글이 게시글 탭으로 자동 편입 (popular_ban_*)"
        actions={
          <SegmentedControl value={tab} onChange={setTab} label="대상" size="md">
            {Object.keys(LABEL).map((k) => <SegmentedControlItem key={k} value={k} label={`${LABEL[k]} ${rows[k].length}`} />)}
          </SegmentedControl>
        } />
      <Card padding={0}><Table<BanRow> data={rows[tab]} columns={cols} idKey="id" density="balanced" dividers="rows" hasHover /></Card>
    </VStack>
  );
}

/* 3. 검수 큐 — 기존 분산(게시글 삭제 처리/키워드 감지/핫게시글 알림) 통합 큐 */
type QItem = { id: number; type: '삭제 요청' | '키워드 감지' | '핫게시글'; title: string; cafe: string; req: string; at: string; ai: number; reasons: string[]; sla: number };
const Q_INIT: QItem[] = [
  { id: 1, type: '삭제 요청', title: '개인정보 노출 게시글 삭제 요청', cafe: '여성시대', req: '카페지기', at: '10:41', ai: 84, reasons: ['전화번호 패턴 감지', '주소 문자열 포함'], sla: 4 },
  { id: 2, type: '삭제 요청', title: '저작권 침해 이미지 포함 글', cafe: '도탁스', req: 'CS 이관', at: '10:22', ai: 72, reasons: ['워터마크 이미지 유사', '권리사 신고 이력'], sla: 8 },
  { id: 3, type: '키워드 감지', title: '"불법대출" 포함 신규 글 (조건부 매칭)', cafe: '소주담(談)', req: '시스템', at: '10:05', ai: 91, reasons: ['원천봉쇄 매칭', '외부 링크 포함', '반복 게시'], sla: 6 },
  { id: 4, type: '핫게시글', title: '급상승 글 — 신고 2건 동반', cafe: '이종격투기', req: '시스템', at: '09:58', ai: 55, reasons: ['1시간 내 신고 2건', '유해성 중간'], sla: 20 },
  { id: 5, type: '키워드 감지', title: '"성인광고" 포함 댓글 다수', cafe: '엽기혹은진실', req: '시스템', at: '09:30', ai: 88, reasons: ['성인 키워드 다수', '스팸 계정 추정'], sla: 12 },
  { id: 6, type: '삭제 요청', title: '명예훼손 신고 게시글', cafe: '쭉빵카페', req: '카페지기', at: '09:12', ai: 48, reasons: ['사실확인 필요', '실명 언급'], sla: 18 },
];
const Q_BADGE: Record<QItem['type'], BadgeVariant> = { '삭제 요청': 'red', '키워드 감지': 'yellow', '핫게시글': 'blue' };
const aiVariant = (n: number): BadgeVariant => (n >= 80 ? 'red' : n >= 50 ? 'yellow' : 'green');
export function ReviewQueue() {
  const [filter, setFilter] = useState<'전체' | QItem['type']>('전체');
  const [items, setItems] = useState(Q_INIT);
  const [done, setDone] = useState(0);
  // AI 스코어 높은 순 = 위험 우선 (전량 육안 → AI 1차 + 예외 검수)
  const list = items.filter((i) => filter === '전체' || i.type === filter).sort((a, b) => b.ai - a.ai);
  const handle = (id: number) => { setItems((s) => s.filter((x) => x.id !== id)); setDone((d) => d + 1); };
  return (
    <VStack gap={5}>
      <PageHeader title="검수 큐" meta={<><Badge variant="yellow" label={`대기 ${items.length}`} /><Badge variant="red" label={`SLA 임박 ${items.filter((i) => i.sla <= 6).length}`} /></>}
        description="AI 1차 스코어링 우선순위 큐 — 게시글 삭제·키워드 감지·핫게시글 통합. 판정 결과는 AI 재학습에 태깅"
        actions={
          <SegmentedControl value={filter} onChange={(v) => setFilter(v as never)} label="유형" size="md">
            {(['전체', '삭제 요청', '키워드 감지', '핫게시글'] as const).map((t) => <SegmentedControlItem key={t} value={t} label={t} />)}
          </SegmentedControl>
        } />
      <Card padding={4}><HStack gap={3} vAlign="center"><Text type="supporting">오늘 처리 {done}건</Text><StackItem size="fill"><ProgressBar label="처리" isLabelHidden value={done} max={done + items.length} variant="accent" /></StackItem></HStack></Card>
      <Card padding={0}>
        <List hasDividers density="balanced">
          {list.map((i) => (
            <ListItem key={i.id} label={i.title} description={`${i.cafe} · ${i.req} · ${i.at} · ${i.reasons.join(' · ')}`}
              startContent={<VStack gap={1}><Badge variant={aiVariant(i.ai)} label={`AI ${i.ai}`} /><Badge variant={Q_BADGE[i.type]} label={i.type} /></VStack>}
              endContent={<HStack gap={2} vAlign="center">{i.sla <= 6 && <Badge variant="red" label={`SLA ${i.sla}h`} />}<Button label="승인" variant="primary" size="sm" onClick={() => handle(i.id)} /><Button label="반려" variant="secondary" size="sm" onClick={() => handle(i.id)} /><Button label="에스컬레이션" variant="ghost" size="sm" onClick={() => handle(i.id)} /></HStack>} />
          ))}
        </List>
        {list.length === 0 && <Card padding={6}><Text type="supporting" color="secondary">대기 항목이 없습니다 🎉</Text></Card>}
      </Card>
    </VStack>
  );
}

/* 4. 신고 · 제재 처리 — 신고 접수 → 제재 액션(경고/노출제한/이용정지) 실행 */
type Report = { id: number; type: string; title: string; target: string; cafe: string; elapsed: number; reporter: string };
const R_INIT: Report[] = [
  { id: 1, type: '권리침해', title: '연예인 사진 무단 게재', target: 'user_a83**', cafe: '여성시대', elapsed: 26, reporter: '권리사(대행)' },
  { id: 2, type: '음란물', title: '성인 콘텐츠 링크 포함', target: 'adult_zx**', cafe: '알 수 없는 카페', elapsed: 19, reporter: '자동 감지' },
  { id: 3, type: '스팸', title: '동일 광고글 12건 도배', target: 'spam_bot**', cafe: '도탁스', elapsed: 8, reporter: '회원 신고(4)' },
  { id: 4, type: '권리침해', title: '기사 전문 무단 전재', target: 'news_cp**', cafe: '홀리건 천국', elapsed: 5, reporter: '언론사' },
  { id: 5, type: '기타', title: '사칭 계정 신고', target: 'fake_star**', cafe: '임영웅 공식', elapsed: 2, reporter: '카페지기' },
];
const SANCTIONS = ['경고', '게시글 삭제', '노출 제한', '이용 정지(7일)', '영구 정지'];
export function Reports() {
  const [items, setItems] = useState(R_INIT);
  const [sel, setSel] = useState<Report | null>(R_INIT[0]);
  const [log, setLog] = useState<string[]>(['07-01 · fraud_kk** → 이용 정지(7일) (박검수)']);
  const apply = (r: Report, action: string) => {
    setItems((s) => s.filter((x) => x.id !== r.id));
    setLog((l) => [`07-02 · ${r.target} → ${action} (halo.wave)`, ...l]);
    setSel(null);
  };
  return (
    <VStack gap={5}>
      <PageHeader title="신고 · 제재 처리" meta={<Badge variant="red" label={`대기 ${items.length}`} />}
        description="신고 접수 → 검토 → 제재 액션 실행 (계정 제재 권한 필요) · SLA 24시간" />
      <HStack gap={4} vAlign="start" wrap="wrap">
        <StackItem size="fill">
          <Card padding={0}>
            <List hasDividers density="balanced" header={<Heading level={4}>신고 큐</Heading>}>
              {items.map((r) => (
                <ListItem key={r.id} label={r.title} description={`${r.target} · ${r.cafe} · ${r.reporter} · ${r.elapsed}h 경과`}
                  isSelected={sel?.id === r.id} onClick={() => setSel(r)}
                  startContent={<Badge variant={r.type === '권리침해' ? 'red' : r.type === '음란물' ? 'purple' : r.type === '스팸' ? 'yellow' : 'neutral'} label={r.type} />}
                  endContent={r.elapsed >= 24 ? <Badge variant="red" label="SLA 초과" /> : undefined} />
              ))}
            </List>
            {items.length === 0 && <Card padding={6}><Text type="supporting" color="secondary">대기 신고가 없습니다 🎉</Text></Card>}
          </Card>
        </StackItem>
        {sel && (
          <Card padding={4} width={340}>
            <VStack gap={3}>
              <Heading level={4}>제재 검토</Heading>
              <MetadataList columns="single">
                <MetadataListItem label="신고 유형">{sel.type}</MetadataListItem>
                <MetadataListItem label="대상 계정">{sel.target}</MetadataListItem>
                <MetadataListItem label="카페">{sel.cafe}</MetadataListItem>
                <MetadataListItem label="신고자">{sel.reporter}</MetadataListItem>
                <MetadataListItem label="경과">{sel.elapsed}시간</MetadataListItem>
              </MetadataList>
              <Divider />
              <Text type="label">제재 액션</Text>
              <VStack gap={2}>
                {SANCTIONS.map((a, i) => <Button key={a} label={a} variant={i === 0 ? 'secondary' : i >= 3 ? 'secondary' : 'primary'} size="sm" onClick={() => apply(sel, a)} />)}
                <Button label="반려 (신고 기각)" variant="ghost" size="sm" onClick={() => apply(sel, '반려')} />
              </VStack>
            </VStack>
          </Card>
        )}
      </HStack>
      <Card padding={5}><VStack gap={2}><Heading level={4}>제재 이력</Heading><Divider />{log.map((l) => <Text key={l} type="supporting" color="secondary">{l}</Text>)}</VStack></Card>
    </VStack>
  );
}

/* 5. 추천 컨텐츠 관리 — 큐레이션 + AI 소재 검증 + CBT→실서버 스테이징 */
type RecoStage = 'draft' | 'cbt' | 'live';
type RecoSlot = { name: string; target: number; items: string[]; checks: { label: string; ok: boolean }[]; stage: RecoStage };
const STAGE_LABEL: Record<RecoStage, string> = { draft: '초안', cbt: 'CBT 노출', live: '실서버 노출' };
export function Reco() {
  const [slots, setSlots] = useState<RecoSlot[]>([
    { name: '주간 추천 카페', target: 5, items: ['플랜테리어', '요리하는 자취생', '캠핑lovers'], checks: [{ label: '규격', ok: true }, { label: '금칙어', ok: true }, { label: '랜딩 URL', ok: true }], stage: 'live' },
    { name: '에디터 픽 게시글', target: 8, items: ['자취 5년차 자취요리 10선', '초보 실내식물 추천', '편의점 라면 조합 끝판왕', '홈카페 분위기 내는 법', '다이소 수납 꿀템'], checks: [{ label: '규격', ok: true }, { label: '금칙어', ok: true }, { label: '랜딩 URL', ok: false }], stage: 'cbt' },
    { name: '신규 카페 스포트라이트', target: 3, items: ['Backcountry Camping'], checks: [{ label: '규격', ok: true }, { label: '금칙어', ok: true }, { label: '랜딩 URL', ok: true }], stage: 'draft' },
  ]);
  const setStage = (si: number, stage: RecoStage) => setSlots((all) => all.map((x, i) => (i === si ? { ...x, stage } : x)));
  return (
    <VStack gap={5}>
      <PageHeader title="추천 컨텐츠 관리" description="추천 슬롯 큐레이션 + AI 소재 자동 검증(규격·금칙어·랜딩 URL) — 검증 실패 시 실서버 승격 차단, CBT→실서버 스테이징" />
      <Grid columns={{ minWidth: 280 }} gap={3}>
        {slots.map((s, si) => {
          const checksOk = s.checks.every((c) => c.ok);
          return (
            <Card key={s.name} padding={4}>
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Heading level={4}>{s.name}</Heading>
                  <Badge variant={s.stage === 'live' ? 'green' : s.stage === 'cbt' ? 'yellow' : 'neutral'} label={STAGE_LABEL[s.stage]} />
                  {s.items.length < s.target && <Badge variant="yellow" label={`${s.target - s.items.length} 부족`} />}
                </HStack>
                <ProgressBar label={s.name} isLabelHidden value={s.items.length} max={s.target} variant={s.items.length >= s.target ? 'success' : 'accent'} />
                <List density="compact" hasDividers>
                  {s.items.map((it) => (
                    <ListItem key={it} label={it} endContent={<Button label="제외" variant="ghost" size="sm" onClick={() => setSlots((all) => all.map((x, i) => i === si ? { ...x, items: x.items.filter((y) => y !== it) } : x))} />} />
                  ))}
                </List>
                <HStack gap={2} wrap="wrap" vAlign="center">
                  <Text type="label" color="secondary">AI 검증</Text>
                  {s.checks.map((c) => <Badge key={c.label} variant={c.ok ? 'green' : 'red'} label={`${c.label} ${c.ok ? '✓' : '실패'}`} />)}
                </HStack>
                {!checksOk && <Text type="supporting" color="secondary">검증 실패 항목이 있어 실서버 승격이 차단됩니다.</Text>}
                <HStack gap={2}>
                  {s.stage === 'draft' && <Button label="CBT 노출" variant="secondary" size="sm" onClick={() => setStage(si, 'cbt')} />}
                  {s.stage === 'cbt' && <>
                    <Button label="실서버 노출" variant="primary" size="sm" isDisabled={!checksOk} onClick={() => setStage(si, 'live')} />
                    <Button label="초안으로" variant="ghost" size="sm" onClick={() => setStage(si, 'draft')} />
                  </>}
                  {s.stage === 'live' && <Button label="노출 종료" variant="secondary" size="sm" onClick={() => setStage(si, 'draft')} />}
                </HStack>
              </VStack>
            </Card>
          );
        })}
      </Grid>
    </VStack>
  );
}

/* 6. 개별카페 · 회원 관리 — 검색 + 읽기 전용 상세 (1차) */
type Cafe = { grpcode: string; name: string; members: string; grade: string; opened: string; state: '정상' | '휴면' | '제재' };
const CAFES_DB: Cafe[] = [
  { grpcode: 'subdued20club', name: '＊여성시대＊ 차분한 20대들의 알흠다운 공간', members: '167만', grade: '플래티넘', opened: '2005.03', state: '정상' },
  { grpcode: 'dotax', name: '도탁스 (DOTAX)', members: '112만', grade: '플래티넘', opened: '2004.11', state: '정상' },
  { grpcode: 'ssaumjil', name: '이종격투기', members: '98만', grade: '플래티넘', opened: '2003.07', state: '정상' },
  { grpcode: 'ok1221', name: '쭉빵카페', members: '154만', grade: '플래티넘', opened: '2004.02', state: '정상' },
  { grpcode: 'adult0x', name: '성인모임방', members: '1.2만', grade: '일반', opened: '2019.05', state: '제재' },
];
export function Members() {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Cafe | null>(CAFES_DB[0]);
  const [tab, setTab] = useState<'info' | 'sanction'>('info');
  const list = CAFES_DB.filter((c) => !q.trim() || c.name.includes(q.trim()) || c.grpcode.includes(q.trim()));
  const cols: TableColumn<Cafe>[] = [
    { key: 'name', header: '카페', width: proportional(1), renderCell: (c) => <VStack gap={0}><Text weight="medium" maxLines={1}>{c.name}</Text><Text type="supporting" color="secondary">{c.grpcode}</Text></VStack> },
    { key: 'members', header: '회원', width: pixel(80), align: 'end', renderCell: (c) => <Text type="supporting">{c.members}</Text> },
    { key: 'grade', header: '등급', width: pixel(90), renderCell: (c) => <Badge variant="cyan" label={c.grade} /> },
    { key: 'state', header: '상태', width: pixel(80), renderCell: (c) => <Badge variant={c.state === '정상' ? 'green' : c.state === '제재' ? 'red' : 'neutral'} label={c.state} /> },
    { key: 'act', header: '', width: pixel(72), align: 'end', renderCell: (c) => <Button label="상세" variant="secondary" size="sm" onClick={() => setSel(c)} /> },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="개별카페 · 회원 관리" description="1차: 검색 + 읽기 전용 조회 (/cafemanage + /cafeMember 통합) · 쓰기 액션은 권한 연동 후 개방" />
      <HStack gap={2} vAlign="center"><StackItem size="fill"><TextInput label="카페 검색" isLabelHidden size="md" value={q} onChange={setQ} /></StackItem><Text type="supporting" color="secondary">{list.length}건</Text></HStack>
      <HStack gap={4} vAlign="start" wrap="wrap">
        <StackItem size="fill"><Card padding={0}><Table<Cafe> data={list} columns={cols} idKey="grpcode" density="balanced" dividers="rows" hasHover /></Card></StackItem>
        {sel && (
          <Card padding={4} width={340}>
            <VStack gap={3}>
              <Heading level={4}>{sel.name}</Heading>
              <SegmentedControl value={tab} onChange={(v) => setTab(v as never)} label="탭" size="sm">
                <SegmentedControlItem value="info" label="기본정보" />
                <SegmentedControlItem value="sanction" label="제재 이력" />
              </SegmentedControl>
              {tab === 'info' ? (
                <MetadataList columns="single">
                  <MetadataListItem label="grpcode">{sel.grpcode}</MetadataListItem>
                  <MetadataListItem label="회원 수">{sel.members}</MetadataListItem>
                  <MetadataListItem label="등급">{sel.grade}</MetadataListItem>
                  <MetadataListItem label="개설">{sel.opened}</MetadataListItem>
                  <MetadataListItem label="상태"><Badge variant={sel.state === '정상' ? 'green' : 'red'} label={sel.state} /></MetadataListItem>
                </MetadataList>
              ) : (
                <List density="compact" hasDividers>
                  {sel.state === '제재'
                    ? <ListItem label="성인 콘텐츠 — 노출 제한" description="2026.06.15 · 최관리" startContent={<Badge variant="red" label="제재" />} />
                    : <ListItem label="제재 이력이 없습니다" description="최근 1년 기준" />}
                </List>
              )}
            </VStack>
          </Card>
        )}
      </HStack>
    </VStack>
  );
}

/* 7. 팬카페 관리 — 검색 + 등급 필터 + 상태 액션 */
type Fan = { id: number; name: string; artist: string; grade: '공식' | '인증' | '일반'; state: '운영중' | '휴면' | '정지'; owner: string; members: string };
const FAN_INIT: Fan[] = [
  { id: 1, name: '임영웅 공식', artist: '임영웅', grade: '공식', state: '운영중', owner: 'yerin.axz', members: '42만' },
  { id: 2, name: '우정잉 팬까페 잉친쓰', artist: '우정잉', grade: '공식', state: '운영중', owner: 'jisu.axz', members: '8.1만' },
  { id: 3, name: '아이유 유애나', artist: '아이유', grade: '인증', state: '운영중', owner: 'minho.axz', members: '31만' },
  { id: 4, name: '에스파 마이', artist: '에스파', grade: '인증', state: '운영중', owner: 'yerin.axz', members: '19만' },
  { id: 5, name: '(구)추억의 팬카페', artist: '-', grade: '일반', state: '휴면', owner: '-', members: '0.3만' },
];
// 일일 랭킹 (/fancafe/daily/ranking — 응원위젯 클릭·활동 종합)
type FanRank = { rank: number; star: string; cafe: string; members: string; posts: number; cheer: number; score: number };
const FAN_RANKING: FanRank[] = [
  { rank: 1, star: '임영웅', cafe: '임영웅 공식', members: '42만', posts: 3204, cheer: 89200, score: 98 },
  { rank: 2, star: '아이유', cafe: '아이유 유애나', members: '31만', posts: 2180, cheer: 76400, score: 95 },
  { rank: 3, star: '에스파', cafe: '에스파 마이', members: '19만', posts: 4120, cheer: 71050, score: 93 },
  { rank: 4, star: '우정잉', cafe: '우정잉 팬까페 잉친쓰', members: '8.1만', posts: 1540, cheer: 44900, score: 88 },
  { rank: 5, star: '손흥민', cafe: '손흥민 월클', members: '6.2만', posts: 1980, cheer: 39800, score: 85 },
];
// 스타게시판 대표 글 (/fancafe/star/article)
const STAR_ARTICLES = [
  { id: 1, star: '임영웅', title: '콘서트 후기 + 직캠 모음', at: '07-05', featured: true },
  { id: 2, star: '아이유', title: '신곡 뮤비 비하인드 반응', at: '07-05', featured: true },
  { id: 3, star: '에스파', title: '컴백 D-3 티저 정리', at: '07-04', featured: false },
  { id: 4, star: '우정잉', title: '팬미팅 공지 및 신청 안내', at: '07-03', featured: false },
];
export function Fancafe() {
  const [tab, setTab] = useState<'list' | 'ranking' | 'star'>('list');
  const [rows, setRows] = useState(FAN_INIT);
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState('전체');
  const [featured, setFeatured] = useState<Record<number, boolean>>(Object.fromEntries(STAR_ARTICLES.map((a) => [a.id, a.featured])));
  const list = rows.filter((f) => (grade === '전체' || f.grade === grade) && (!q.trim() || f.name.includes(q.trim()) || f.artist.includes(q.trim())));
  const toggle = (id: number) => setRows((s) => s.map((f) => f.id === id ? { ...f, state: f.state === '정지' ? '운영중' : '정지' } : f));
  const cols: TableColumn<Fan>[] = [
    { key: 'name', header: '팬카페', width: proportional(1), renderCell: (f) => <VStack gap={0}><Text weight="medium">{f.name}</Text><Text type="supporting" color="secondary">{f.artist} · 회원 {f.members}</Text></VStack> },
    { key: 'grade', header: '등급', width: pixel(80), renderCell: (f) => <Badge variant={f.grade === '공식' ? 'blue' : f.grade === '인증' ? 'cyan' : 'neutral'} label={f.grade} /> },
    { key: 'state', header: '상태', width: pixel(80), renderCell: (f) => <Badge variant={f.state === '운영중' ? 'green' : f.state === '정지' ? 'red' : 'neutral'} label={f.state} /> },
    { key: 'owner', header: '담당', width: pixel(100), renderCell: (f) => <Text type="supporting" color="accent">{f.owner}</Text> },
    { key: 'act', header: '', width: pixel(90), align: 'end', renderCell: (f) => <Button label={f.state === '정지' ? '해제' : '정지'} variant="secondary" size="sm" onClick={() => toggle(f.id)} /> },
  ];
  const rankCols: TableColumn<FanRank>[] = [
    { key: 'rank', header: '순위', width: pixel(56), renderCell: (r) => <Badge variant={r.rank <= 3 ? 'purple' : 'neutral'} label={`${r.rank}위`} /> },
    { key: 'star', header: '스타', width: proportional(1), renderCell: (r) => <VStack gap={0}><Text weight="medium">{r.star}</Text><Text type="supporting" color="secondary">{r.cafe}</Text></VStack> },
    { key: 'members', header: '가입자', width: pixel(80), align: 'end', renderCell: (r) => <Text type="supporting">{r.members}</Text> },
    { key: 'posts', header: '게시글', width: pixel(80), align: 'end', renderCell: (r) => <Text type="supporting">{r.posts.toLocaleString()}</Text> },
    { key: 'cheer', header: '응원 클릭', width: pixel(90), align: 'end', renderCell: (r) => <Text type="supporting">{r.cheer.toLocaleString()}</Text> },
    { key: 'score', header: '총점', width: pixel(70), align: 'end', renderCell: (r) => <Badge variant="green" label={String(r.score)} /> },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="팬카페 관리" description="목록 · 일일 랭킹(응원위젯) · 스타게시판 대표 글 — 기존 fancafe/* 9개 메뉴 통합 (공식카페 B2B 확장 대비)"
        actions={
          <SegmentedControl value={tab} onChange={(v) => setTab(v as never)} label="영역" size="md">
            <SegmentedControlItem value="list" label="팬카페 목록" />
            <SegmentedControlItem value="ranking" label="일일 랭킹" />
            <SegmentedControlItem value="star" label="스타 글" />
          </SegmentedControl>
        } />
      {tab === 'list' && <>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <SegmentedControl value={grade} onChange={setGrade} label="등급" size="sm">
            {['전체', '공식', '인증', '일반'].map((g) => <SegmentedControlItem key={g} value={g} label={g} />)}
          </SegmentedControl>
          <StackItem size="fill"><TextInput label="팬카페 검색" isLabelHidden size="md" value={q} onChange={setQ} /></StackItem>
          <Text type="supporting" color="secondary">{list.length}건</Text>
        </HStack>
        <Card padding={0}><Table<Fan> data={list} columns={cols} idKey="id" density="balanced" dividers="rows" hasHover /></Card>
      </>}
      {tab === 'ranking' && <>
        <Card padding={0}><Table<FanRank> data={FAN_RANKING} columns={rankCols} idKey="rank" density="balanced" dividers="rows" hasHover /></Card>
        <Text type="supporting" color="secondary">총점 = 가입자·게시글·방문·응원위젯 클릭 종합 (/fancafe/daily/ranking/view 대체)</Text>
      </>}
      {tab === 'star' && (
        <Card padding={0}>
          <List hasDividers density="balanced">
            {STAR_ARTICLES.map((a) => (
              <ListItem key={a.id} label={a.title} description={`${a.star} · ${a.at}`}
                startContent={<Badge variant="purple" label={a.star} />}
                endContent={featured[a.id]
                  ? <HStack gap={2}><Badge variant="green" label="대표 노출 중" /><Button label="해제" variant="ghost" size="sm" onClick={() => setFeatured((f) => ({ ...f, [a.id]: false }))} /></HStack>
                  : <Button label="대표 노출" variant="secondary" size="sm" onClick={() => setFeatured((f) => ({ ...f, [a.id]: true }))} />} />
            ))}
          </List>
        </Card>
      )}
    </VStack>
  );
}

/* 8. 모바일앱 · 카페 탑 — 지면 통합 + 전체 푸시(캠페인 재설계) */
type PushStage = 'draft' | 'tested' | 'approved' | 'scheduled' | 'done';
const PUSH_STEPS: { key: PushStage; label: string }[] = [
  { key: 'draft', label: '초안' }, { key: 'tested', label: '테스트 발송' }, { key: 'approved', label: '2인 승인' }, { key: 'scheduled', label: '예약' }, { key: 'done', label: '발송' },
];
function PushCampaign() {
  const [stage, setStage] = useState<PushStage>('draft');
  const [msg, setMsg] = useState('여름 인기글 특집이 도착했어요 ☀️');
  const [target, setTarget] = useState('AOS');
  const idx = PUSH_STEPS.findIndex((s) => s.key === stage);
  const reach: Record<string, string> = { 전체: '482만', AOS: '291만', iOS: '191만' };
  return (
    <VStack gap={4}>
      {/* 기존: 원클릭 즉시 전송 + 개인 비번 입력 → 캠페인 모델로 대체 */}
      <Card padding={4}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          {PUSH_STEPS.map((s, i) => (
            <HStack key={s.key} gap={2} vAlign="center">
              {i > 0 && <Text type="supporting" color="secondary">›</Text>}
              <Badge variant={i < idx ? 'success' : i === idx ? 'blue' : 'neutral'} label={`${i + 1}. ${s.label}`} />
            </HStack>
          ))}
          <StackItem size="fill" />
          <Text type="supporting" color="secondary">개인 계정 비번 입력 제거 · SSO 위임 · 전체 발송 30분 예약 유예</Text>
        </HStack>
      </Card>
      <Grid columns={{ minWidth: 300 }} gap={3}>
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={4}>메시지 편집</Heading>
            <TextInput label="푸시 메시지" size="sm" value={msg} onChange={setMsg} isDisabled={idx >= 2} />
            <SegmentedControl value={target} onChange={setTarget} label="대상" size="sm" isDisabled={idx >= 2}>
              {['전체', 'AOS', 'iOS'].map((t) => <SegmentedControlItem key={t} value={t} label={t} />)}
            </SegmentedControl>
            <Text type="supporting" color="secondary">예상 도달 {reach[target]}명{target === '전체' ? ' · 30분 예약 유예 적용' : ''}</Text>
          </VStack>
        </Card>
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={4}>미리보기 · 진행</Heading>
            <Card padding={3}><VStack gap={0}><Text weight="semibold">다음카페</Text><Text type="supporting">{msg}</Text></VStack></Card>
            {stage === 'draft' && <Button label="테스트 발송 (내부 기기 3대)" variant="secondary" size="sm" onClick={() => setStage('tested')} />}
            {stage === 'tested' && <VStack gap={2}>
              <Text type="supporting" color="secondary">작성 halo.wave · 승인 approver.pi (작성자 ≠ 승인자)</Text>
              <Button label="승인 요청" variant="primary" size="sm" onClick={() => setStage('approved')} />
            </VStack>}
            {stage === 'approved' && <VStack gap={2}>
              <Badge variant="blue" label="예약 시각 21:30 (지금+45분)" />
              <Button label="예약 확정" variant="primary" size="sm" onClick={() => setStage('scheduled')} />
            </VStack>}
            {stage === 'scheduled' && <VStack gap={2}>
              <Badge variant="yellow" label="예약됨 · 21:30 발송 예정" />
              <HStack gap={2}>
                <Button label="지금 발송(테스트)" variant="primary" size="sm" onClick={() => setStage('done')} />
                <Button label="예약 취소" variant="secondary" size="sm" onClick={() => setStage('approved')} />
              </HStack>
            </VStack>}
            {stage === 'done' && <VStack gap={2}>
              <Badge variant="success" label={`발송 완료 · 도달 ${reach[target]}명 · 실패 0`} />
              <Button label="새 캠페인" variant="secondary" size="sm" onClick={() => setStage('draft')} />
            </VStack>}
          </VStack>
        </Card>
      </Grid>
    </VStack>
  );
}
export function AppHome() {
  const [tab, setTab] = useState<'slots' | 'push'>('slots');
  const slots = [
    { title: '앱 이벤트 — 여름 출석체크', kind: '앱 이벤트', period: '07.01 ~ 07.31', state: '노출중' as const, chip: 'green' as BadgeVariant },
    { title: '앱 공지 — 개인정보 처리방침 개정', kind: '앱 공지', period: '06.25 ~ 07.10', state: '노출중' as const, chip: 'blue' as BadgeVariant },
    { title: '앱 버전 — iOS 9.4.0 강제 업데이트', kind: '앱 버전', period: '07.15 예정', state: '예약' as const, chip: 'purple' as BadgeVariant },
    { title: '카페탑 공지 — 인기글 개편 안내', kind: '카페 탑', period: '07.01 ~ 07.14', state: '노출중' as const, chip: 'cyan' as BadgeVariant },
    { title: '카페탑 인벤토리 — 배너 A구좌', kind: '카페 탑', period: '상시', state: '노출중' as const, chip: 'cyan' as BadgeVariant },
    { title: '앱 이벤트 — 봄맞이 (종료)', kind: '앱 이벤트', period: '03.01 ~ 03.31', state: '종료' as const, chip: 'neutral' as BadgeVariant },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="모바일앱 · 카페 탑" description="지면 통합(앱 이벤트·공지·버전·카페탑) + 전체 푸시 재설계 — 기존 '클릭 즉시 전송·취소 불가' 제거"
        actions={
          <SegmentedControl value={tab} onChange={(v) => setTab(v as never)} label="영역" size="md">
            <SegmentedControlItem value="slots" label="지면" />
            <SegmentedControlItem value="push" label="전체 푸시" />
          </SegmentedControl>
        } />
      {tab === 'slots' ? (
        <Grid columns={{ minWidth: 280 }} gap={3}>
          {slots.map((s) => (
            <Card key={s.title} padding={4}>
              <VStack gap={2}>
                <HStack gap={1} vAlign="center"><Badge variant={s.chip} label={s.kind} /><Badge variant={s.state === '노출중' ? 'green' : s.state === '예약' ? 'blue' : 'neutral'} label={s.state} /></HStack>
                <Text weight="medium" maxLines={2}>{s.title}</Text>
                <Text type="supporting" color="secondary">기간 {s.period}</Text>
              </VStack>
            </Card>
          ))}
        </Grid>
      ) : <PushCampaign />}
    </VStack>
  );
}

/* 9·10. 수익·정산 / 통계 — 리포팅 (Excel 유지) */
type ProfitRow = { id: number; partner: string; kind: string; amount: number; state: '정산 완료' | '정산 예정' | '미정산' };
const PROFIT_DATA: ProfitRow[] = [
  { id: 1, partner: '임영웅 공식 (팬카페)', kind: '응원보드', amount: 12400000, state: '정산 완료' },
  { id: 2, partner: '게임사 A (공식카페)', kind: '배너 구좌', amount: 8000000, state: '정산 예정' },
  { id: 3, partner: '커머스 B', kind: '기획전', amount: 3200000, state: '미정산' },
  { id: 4, partner: '뷰티 C (공식카페)', kind: '배너 구좌', amount: 5600000, state: '정산 예정' },
  { id: 5, partner: '식품 D', kind: '응원보드', amount: 2100000, state: '미정산' },
];
const won = (n: number) => '₩' + n.toLocaleString();
export function Profit() {
  const [filter, setFilter] = useState('전체');
  const [ackAnomaly, setAckAnomaly] = useState<Record<number, boolean>>({});
  const list = PROFIT_DATA.filter((r) => filter === '전체' || r.state === filter);
  const sum = (st: string) => PROFIT_DATA.filter((r) => st === '전체' || r.state === st).reduce((a, r) => a + r.amount, 0);
  // 이상 알림 — 미정산 임박 소멸·진행 정체 자동 탐지 (화면 순회+엑셀 취합 → 상단 승격)
  const anomalies = PROFIT_DATA.filter((r) => r.state === '미정산' && !ackAnomaly[r.id]);
  // 유형별 피벗 — 연/월·CP/OS 분산 화면을 축 전환 하나로
  const kinds = [...new Set(PROFIT_DATA.map((r) => r.kind))];
  const byKind = kinds.map((k) => ({ k, total: PROFIT_DATA.filter((r) => r.kind === k).reduce((a, r) => a + r.amount, 0) }));
  const cols: TableColumn<ProfitRow>[] = [
    { key: 'partner', header: '파트너', width: proportional(1), renderCell: (r) => <Text weight="medium">{r.partner}</Text> },
    { key: 'kind', header: '유형', width: pixel(100), renderCell: (r) => <Badge variant="neutral" label={r.kind} /> },
    { key: 'amount', header: '금액', width: pixel(130), align: 'end', renderCell: (r) => <Text type="supporting">{won(r.amount)}</Text> },
    { key: 'state', header: '상태', width: pixel(110), renderCell: (r) => <Badge variant={r.state === '정산 완료' ? 'green' : r.state === '정산 예정' ? 'blue' : 'yellow'} label={r.state} /> },
    { key: 'act', header: '', width: pixel(90), align: 'end', renderCell: (r) => r.state !== '정산 완료' ? <Button label="정산 처리" variant="secondary" size="sm" /> : <Text type="supporting" color="secondary">완료</Text> },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="수익 · 정산" description="7월 정산 현황 · 파트너 정산 처리"
        actions={<>
          <SegmentedControl value={filter} onChange={setFilter} label="상태" size="md">
            {['전체', '정산 완료', '정산 예정', '미정산'].map((s) => <SegmentedControlItem key={s} value={s} label={s} />)}
          </SegmentedControl>
          <Button label="Excel 다운로드" variant="secondary" size="md" />
        </>} />
      {anomalies.length > 0 && (
        <Card padding={0}>
          <List hasDividers density="balanced" header={<Heading level={4}>⚠ 정산 이상 알림 {anomalies.length}건</Heading>}>
            {anomalies.map((r) => (
              <ListItem key={r.id} label={`${r.partner} — 미정산 ${won(r.amount)}`} description="소멸 임박 · 30일 내 미처리 시 자동 소멸"
                startContent={<Badge variant="red" label="임박" />}
                endContent={<HStack gap={2}><Button label="정산 처리" variant="primary" size="sm" onClick={() => setAckAnomaly((a) => ({ ...a, [r.id]: true }))} /><Button label="보류" variant="ghost" size="sm" onClick={() => setAckAnomaly((a) => ({ ...a, [r.id]: true }))} /></HStack>} />
            ))}
          </List>
        </Card>
      )}
      <Grid columns={{ minWidth: 200 }} gap={3}>
        {([['이번 달 수익', sum('전체')], ['정산 완료', sum('정산 완료')], ['미정산', sum('미정산')]] as const).map(([l, v]) => (
          <Card key={l} padding={5}><VStack gap={1}><Text type="supporting">{l}</Text><Heading level={3}>{won(v)}</Heading></VStack></Card>
        ))}
      </Grid>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center"><Heading level={4}>유형별 피벗</Heading><Text type="supporting" color="secondary">연/월·CP/OS 분산 화면 → 축 전환 하나로</Text></HStack>
        <Grid columns={{ minWidth: 180 }} gap={3}>
          {byKind.map(({ k, total }) => (
            <Card key={k} padding={4}><VStack gap={1}><Badge variant="neutral" label={k} /><Heading level={4}>{won(total)}</Heading></VStack></Card>
          ))}
        </Grid>
      </VStack>
      <Card padding={0}><Table<ProfitRow> data={list} columns={cols} idKey="id" density="balanced" dividers="rows" hasHover /></Card>
    </VStack>
  );
}
type StatRow = { d: string; uv: number; pv: number; posts: number; newCafes: number };
const STAT_DATA: StatRow[] = [
  { d: '06-26', uv: 388, pv: 2790, posts: 168, newCafes: 22 },
  { d: '06-27', uv: 402, pv: 2880, posts: 175, newCafes: 27 },
  { d: '06-28', uv: 415, pv: 2960, posts: 181, newCafes: 30 },
  { d: '06-29', uv: 421, pv: 3010, posts: 190, newCafes: 35 },
  { d: '06-30', uv: 398, pv: 2850, posts: 171, newCafes: 24 },
  { d: '07-01', uv: 405, pv: 2904, posts: 178, newCafes: 28 },
  { d: '07-02', uv: 412, pv: 2981, posts: 182, newCafes: 31 },
];
export function Stats() {
  const [metric, setMetric] = useState<'uv' | 'pv' | 'posts' | 'newCafes'>('uv');
  const METRIC_LABEL = { uv: 'UV', pv: 'PV', posts: '게시글', newCafes: '신규 카페' } as const;
  const max = Math.max(...STAT_DATA.map((r) => r[metric]));
  const fmtV = (v: number) => metric === 'newCafes' ? String(v) : v >= 1000 ? (v / 100).toFixed(0) + '0만' : v + '만';
  const today = STAT_DATA[STAT_DATA.length - 1];
  return (
    <VStack gap={5}>
      <PageHeader title="통계" description="서비스 핵심 지표 최근 7일 (/cafestat)" actions={<Button label="Excel 다운로드" variant="secondary" size="md" />} />
      <Grid columns={{ minWidth: 200 }} gap={3}>
        {([['오늘 UV', today.uv + '만'], ['오늘 PV', today.pv.toLocaleString() + '만'], ['게시글', today.posts + '만'], ['신규 카페', String(today.newCafes)]] as const).map(([l, v]) => (
          <Card key={l} padding={5}><VStack gap={1}><Text type="supporting">{l}</Text><Heading level={3}>{v}</Heading></VStack></Card>
        ))}
      </Grid>
      <Card padding={5}>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <StackItem size="fill"><Heading level={4}>추이</Heading></StackItem>
            <SegmentedControl value={metric} onChange={(v) => setMetric(v as never)} label="지표" size="md">
              {(['uv', 'pv', 'posts', 'newCafes'] as const).map((m) => <SegmentedControlItem key={m} value={m} label={METRIC_LABEL[m]} />)}
            </SegmentedControl>
          </HStack>
          <VStack gap={2}>
            {STAT_DATA.map((r) => (
              <HStack key={r.d} gap={3} vAlign="center">
                <HStack width={48}><Text type="supporting" color="secondary">{r.d}</Text></HStack>
                <StackItem size="fill"><ProgressBar label={`${r.d} ${METRIC_LABEL[metric]}`} isLabelHidden value={r[metric]} max={max} variant="accent" /></StackItem>
                <HStack width={72} justify="end"><Text type="supporting">{fmtV(r[metric])}</Text></HStack>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </Card>
    </VStack>
  );
}

/* 11. 운영자 · 권한 — 역할별 권한 매트릭스(규제/제재/조회/카페 열람) + 권한요청 승인 */
type Perm = '조회' | '카페 열람' | '규제' | '제재';
const PERMS: Perm[] = ['조회', '카페 열람', '규제', '제재'];
type RoleDef = { role: string; label: string; who: string; perms: Perm[] };
const ROLE_MATRIX: RoleDef[] = [
  { role: 'SUPERADMIN', label: '최고 관리자', who: 'halo.wave 외 2', perms: ['조회', '카페 열람', '규제', '제재'] },
  { role: 'OPFAVARTICLES', label: '인기글 운영', who: '서비스모니터링팀', perms: ['조회', '카페 열람', '규제'] },
  { role: 'OPCONTENTS', label: '컨텐츠 운영', who: '콘텐츠편집1파트', perms: ['조회', '카페 열람'] },
  { role: 'CSCLEAN', label: '클린센터(제재)', who: '서비스모니터링팀', perms: ['조회', '카페 열람', '제재'] },
  { role: 'TABLE', label: '어시(큐레이션)', who: '외주', perms: ['조회'] },
];
type RoleReq = { id: number; ldap: string; name: string; role: string; reason: string; period: string };
export function Roles() {
  const [reqs, setReqs] = useState<RoleReq[]>([
    { id: 1, ldap: 'mj.assist', name: '엠제이', role: 'TABLE', reason: '카테고리 인기글 큐레이션 (외주 어시) · 조회 권한', period: '90일' },
    { id: 2, ldap: 'julia.assist', name: '줄리아', role: 'TABLE', reason: '카테고리 인기글 큐레이션 (외주 어시) · 조회 권한', period: '90일' },
    { id: 3, ldap: 'sungbin.gn', name: '성빈', role: 'OPFAVARTICLES', reason: '인기글 운영 — 규제 권한 포함 요청', period: '상시' },
  ]);
  const [log, setLog] = useState<string[]>(['06-30 · byunghwi.gn → 인기글 운영(규제) 승인 (halo.wave)']);
  const decide = (r: RoleReq, ok: boolean) => {
    setReqs((s) => s.filter((x) => x.id !== r.id));
    setLog((l) => [`07-02 · ${r.ldap} → ${r.role} ${ok ? '승인' : '반려'} (halo.wave)`, ...l]);
  };
  const cols: TableColumn<RoleDef>[] = [
    { key: 'role', header: '역할', width: proportional(1), renderCell: (r) => <VStack gap={0}><Text weight="medium">{r.label}</Text><Text type="supporting" color="secondary">{r.who}</Text></VStack> },
    ...PERMS.map((p): TableColumn<RoleDef> => ({
      key: p, header: p, width: pixel(88), align: 'center',
      renderCell: (r) => r.perms.includes(p)
        ? <Badge variant={p === '제재' ? 'red' : p === '규제' ? 'yellow' : 'green'} label="●" />
        : <Text type="supporting" color="secondary">–</Text>,
    })),
  ];
  // 계정 위생 — 사용만료 임박·서약서 미확인 자동 통지 (기존: 없음)
  const HYGIENE: { ldap: string; name: string; issue: string; variant: BadgeVariant; label: string }[] = [
    { ldap: 'op.contents', name: '김운영', issue: '사용만료 2026-07-18 (12일 남음)', variant: 'yellow', label: '만료임박' },
    { ldap: 'op.fav', name: '정인기', issue: '보안 서약서 미확인 · 사용만료 07-10', variant: 'red', label: '서약서 미확인' },
    { ldap: 'pi.guard', name: '최비밀', issue: '사용만료 2026-06-30 (만료됨) — 접근 차단', variant: 'red', label: '만료' },
  ];
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  return (
    <VStack gap={5}>
      <PageHeader title="운영자 · 권한" meta={<><Badge variant="yellow" label={`요청 ${reqs.length}`} /><Badge variant="red" label={`계정 위생 ${HYGIENE.filter((h) => !notified[h.ldap]).length}`} /></>}
        description="계정 권한 유형: 조회 · 카페 열람 · 규제(금칙어/노출제외) · 제재(계정 정지) — 기간 한정 부여 후 자동 회수" />
      {HYGIENE.some((h) => !notified[h.ldap]) && (
        <Card padding={0}>
          <List hasDividers density="balanced" header={<Heading level={4}>⚠ 계정 위생 알림</Heading>}>
            {HYGIENE.filter((h) => !notified[h.ldap]).map((h) => (
              <ListItem key={h.ldap} label={`${h.name} (${h.ldap})`} description={h.issue}
                startContent={<Badge variant={h.variant} label={h.label} />}
                endContent={<Button label="갱신 통지" variant="secondary" size="sm" onClick={() => setNotified((n) => ({ ...n, [h.ldap]: true }))} />} />
            ))}
          </List>
        </Card>
      )}
      <VStack gap={2}>
        <Heading level={4}>역할별 권한 매트릭스</Heading>
        <Card padding={0}><Table<RoleDef> data={ROLE_MATRIX} columns={cols} idKey="role" density="balanced" dividers="rows" /></Card>
      </VStack>
      <Card padding={0}>
        <List hasDividers density="balanced" header={<Heading level={4}>권한 요청 승인 대기</Heading>}>
          {reqs.map((r) => (
            <ListItem key={r.id} label={`${r.name} (${r.ldap})`} description={r.reason + ` · 기간 ${r.period}`}
              startContent={<Badge variant="purple" label={r.role} />}
              endContent={<HStack gap={2}><Button label="승인" variant="primary" size="sm" onClick={() => decide(r, true)} /><Button label="반려" variant="secondary" size="sm" onClick={() => decide(r, false)} /></HStack>} />
          ))}
        </List>
        {reqs.length === 0 && <Card padding={6}><Text type="supporting" color="secondary">대기 중인 요청이 없습니다.</Text></Card>}
      </Card>
      <Card padding={5}><VStack gap={2}><Heading level={4}>처리 이력</Heading><Divider />{log.map((l) => <Text key={l} type="supporting" color="secondary">{l}</Text>)}</VStack></Card>
    </VStack>
  );
}

/* 12. 배포일지 — 배너/트롬/릴리즈 통합 타임라인 (기존: 외부 링크) */
export function DeployLog() {
  const rows = [
    { kind: '트롬 배포', v: 'red' as BadgeVariant, msg: '2026-07-02 카테고리 인기글 6개 스토리 · 48건 피딩', by: 'halo.wave', at: '07-02 11:20' },
    { kind: '배너 실서버', v: 'red' as BadgeVariant, msg: '배너 11건 반영', by: 'halo.wave', at: '06-24 10:32' },
    { kind: '배너 CBT', v: 'blue' as BadgeVariant, msg: '배너 11건 반영', by: 'halo.wave', at: '06-24 10:18' },
    { kind: '어드민 릴리즈', v: 'purple' as BadgeVariant, msg: 'CAFE-28046 트롬 플러스터 CP전송 시 슬레이트 전송 (#1105)', by: 'hyeonjin.gn', at: '06-30' },
    { kind: '어드민 릴리즈', v: 'purple' as BadgeVariant, msg: 'CAFE-28104 권리침해 신고 URL 변경 (#1104)', by: 'jeonghyun.gn', at: '06-24' },
    { kind: '어드민 릴리즈', v: 'purple' as BadgeVariant, msg: 'CAFE-27961 CafePopularArticleDao SQL 정리 (#1103)', by: 'jeonghyun.gn', at: '06-17' },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="배포일지" description="배너 · 트롬 · 어드민 릴리즈 통합 타임라인 (기존: 외부 링크 → 실데이터 통합)" />
      <Card padding={0}>
        <List hasDividers density="balanced">
          {rows.map((r, i) => (
            <ListItem key={i} label={r.msg} description={`${r.by} · ${r.at}`} startContent={<Badge variant={r.v} label={r.kind} />} />
          ))}
        </List>
      </Card>
    </VStack>
  );
}
