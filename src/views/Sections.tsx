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
  const cur = WORD_TABS.find((t) => t.key === tab)!;
  const add = () => { const v = input.trim(); if (v && !words[tab].includes(v)) setWords((w) => ({ ...w, [tab]: [...w[tab], v] })); setInput(''); };
  return (
    <VStack gap={5}>
      <PageHeader title="금칙어 · 규제 키워드" description="기존 4개 분산 메뉴(차단어/화이트/조건부/인기글 규제) 통합 — 등록 즉시 전 서비스 반영"
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
            {words[tab].map((w) => <Token key={w} label={w} color={cur.color} size="sm" onRemove={() => setWords((s) => ({ ...s, [tab]: s[tab].filter((x) => x !== w) }))} />)}
          </HStack>
        </VStack>
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
type QItem = { id: number; type: '삭제 요청' | '키워드 감지' | '핫게시글'; title: string; cafe: string; req: string; at: string };
const Q_INIT: QItem[] = [
  { id: 1, type: '삭제 요청', title: '개인정보 노출 게시글 삭제 요청', cafe: '여성시대', req: '카페지기', at: '10:41' },
  { id: 2, type: '삭제 요청', title: '저작권 침해 이미지 포함 글', cafe: '도탁스', req: 'CS 이관', at: '10:22' },
  { id: 3, type: '키워드 감지', title: '"불법대출" 포함 신규 글 (조건부 매칭)', cafe: '소주담(談)', req: '시스템', at: '10:05' },
  { id: 4, type: '핫게시글', title: '급상승 글 — 신고 2건 동반', cafe: '이종격투기', req: '시스템', at: '09:58' },
  { id: 5, type: '키워드 감지', title: '"성인광고" 포함 댓글 다수', cafe: '엽기혹은진실', req: '시스템', at: '09:30' },
  { id: 6, type: '삭제 요청', title: '명예훼손 신고 게시글', cafe: '쭉빵카페', req: '카페지기', at: '09:12' },
];
const Q_BADGE: Record<QItem['type'], BadgeVariant> = { '삭제 요청': 'red', '키워드 감지': 'yellow', '핫게시글': 'blue' };
export function ReviewQueue() {
  const [filter, setFilter] = useState<'전체' | QItem['type']>('전체');
  const [items, setItems] = useState(Q_INIT);
  const [done, setDone] = useState(0);
  const list = items.filter((i) => filter === '전체' || i.type === filter);
  const handle = (id: number) => { setItems((s) => s.filter((x) => x.id !== id)); setDone((d) => d + 1); };
  return (
    <VStack gap={5}>
      <PageHeader title="검수 큐" meta={<Badge variant="yellow" label={`대기 ${items.length}`} />}
        description="기존 분산 검수 업무(게시글 삭제 처리 · 키워드 모니터링 · 핫게시글 알림) 통합 큐 — 처리 시 즉시 제거"
        actions={
          <SegmentedControl value={filter} onChange={(v) => setFilter(v as never)} label="유형" size="md">
            {(['전체', '삭제 요청', '키워드 감지', '핫게시글'] as const).map((t) => <SegmentedControlItem key={t} value={t} label={t} />)}
          </SegmentedControl>
        } />
      <Card padding={4}><HStack gap={3} vAlign="center"><Text type="supporting">오늘 처리 {done}건</Text><StackItem size="fill"><ProgressBar label="처리" isLabelHidden value={done} max={done + items.length} variant="accent" /></StackItem></HStack></Card>
      <Card padding={0}>
        <List hasDividers density="balanced">
          {list.map((i) => (
            <ListItem key={i.id} label={i.title} description={`${i.cafe} · ${i.req} · ${i.at}`}
              startContent={<Badge variant={Q_BADGE[i.type]} label={i.type} />}
              endContent={<HStack gap={2}><Button label="승인" variant="primary" size="sm" onClick={() => handle(i.id)} /><Button label="반려" variant="secondary" size="sm" onClick={() => handle(i.id)} /></HStack>} />
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

/* 5. 추천 컨텐츠 관리 — 큐레이션 라이트 (StarArticle 계열) */
type RecoSlot = { name: string; target: number; items: string[] };
export function Reco() {
  const [slots, setSlots] = useState<RecoSlot[]>([
    { name: '주간 추천 카페', target: 5, items: ['플랜테리어', '요리하는 자취생', '캠핑lovers'] },
    { name: '에디터 픽 게시글', target: 8, items: ['자취 5년차 자취요리 10선', '초보 실내식물 추천', '편의점 라면 조합 끝판왕', '홈카페 분위기 내는 법', '다이소 수납 꿀템'] },
    { name: '신규 카페 스포트라이트', target: 3, items: ['Backcountry Camping'] },
  ]);
  return (
    <VStack gap={5}>
      <PageHeader title="추천 컨텐츠 관리" description="추천 슬롯별 큐레이션 — 카테고리 인기글과 동일 워크플로 (StarArticle)" />
      <Grid columns={{ minWidth: 280 }} gap={3}>
        {slots.map((s, si) => (
          <Card key={s.name} padding={4}>
            <VStack gap={2}>
              <HStack gap={2} vAlign="center"><Heading level={4}>{s.name}</Heading>{s.items.length >= s.target ? <Badge variant="green" label="완료" /> : <Badge variant="yellow" label={`${s.target - s.items.length} 부족`} />}</HStack>
              <ProgressBar label={s.name} isLabelHidden value={s.items.length} max={s.target} variant={s.items.length >= s.target ? 'success' : 'accent'} />
              <List density="compact" hasDividers>
                {s.items.map((it) => (
                  <ListItem key={it} label={it} endContent={<Button label="제외" variant="ghost" size="sm" onClick={() => setSlots((all) => all.map((x, i) => i === si ? { ...x, items: x.items.filter((y) => y !== it) } : x))} />} />
                ))}
              </List>
            </VStack>
          </Card>
        ))}
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
export function Fancafe() {
  const [rows, setRows] = useState(FAN_INIT);
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState('전체');
  const list = rows.filter((f) => (grade === '전체' || f.grade === grade) && (!q.trim() || f.name.includes(q.trim()) || f.artist.includes(q.trim())));
  const toggle = (id: number) => setRows((s) => s.map((f) => f.id === id ? { ...f, state: f.state === '정지' ? '운영중' : '정지' } : f));
  const cols: TableColumn<Fan>[] = [
    { key: 'name', header: '팬카페', width: proportional(1), renderCell: (f) => <VStack gap={0}><Text weight="medium">{f.name}</Text><Text type="supporting" color="secondary">{f.artist} · 회원 {f.members}</Text></VStack> },
    { key: 'grade', header: '등급', width: pixel(80), renderCell: (f) => <Badge variant={f.grade === '공식' ? 'blue' : f.grade === '인증' ? 'cyan' : 'neutral'} label={f.grade} /> },
    { key: 'state', header: '상태', width: pixel(80), renderCell: (f) => <Badge variant={f.state === '운영중' ? 'green' : f.state === '정지' ? 'red' : 'neutral'} label={f.state} /> },
    { key: 'owner', header: '담당', width: pixel(100), renderCell: (f) => <Text type="supporting" color="accent">{f.owner}</Text> },
    { key: 'act', header: '', width: pixel(90), align: 'end', renderCell: (f) => <Button label={f.state === '정지' ? '해제' : '정지'} variant="secondary" size="sm" onClick={() => toggle(f.id)} /> },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="팬카페 관리" description="공식·인증 팬카페 상태/컨텐츠 관리 (/fancafe — 공식카페 B2B 확장 대비)"
        actions={
          <SegmentedControl value={grade} onChange={setGrade} label="등급" size="md">
            {['전체', '공식', '인증', '일반'].map((g) => <SegmentedControlItem key={g} value={g} label={g} />)}
          </SegmentedControl>
        } />
      <HStack gap={2} vAlign="center"><StackItem size="fill"><TextInput label="팬카페 검색" isLabelHidden size="md" value={q} onChange={setQ} /></StackItem><Text type="supporting" color="secondary">{list.length}건</Text></HStack>
      <Card padding={0}><Table<Fan> data={list} columns={cols} idKey="id" density="balanced" dividers="rows" hasHover /></Card>
    </VStack>
  );
}

/* 8. 모바일앱 · 카페 탑 — 지면 통합 (앱 이벤트/공지/버전 + 카페탑) */
export function AppHome() {
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
      <PageHeader title="모바일앱 · 카페 탑" description="기존 4개 영역(앱 이벤트·앱 공지·앱 버전·카페탑) 지면 통합 — 카페배너와 동일 패턴" />
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
  const list = PROFIT_DATA.filter((r) => filter === '전체' || r.state === filter);
  const sum = (st: string) => PROFIT_DATA.filter((r) => st === '전체' || r.state === st).reduce((a, r) => a + r.amount, 0);
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
      <Grid columns={{ minWidth: 200 }} gap={3}>
        {([['이번 달 수익', sum('전체')], ['정산 완료', sum('정산 완료')], ['미정산', sum('미정산')]] as const).map(([l, v]) => (
          <Card key={l} padding={5}><VStack gap={1}><Text type="supporting">{l}</Text><Heading level={3}>{won(v)}</Heading></VStack></Card>
        ))}
      </Grid>
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
  return (
    <VStack gap={5}>
      <PageHeader title="운영자 · 권한" meta={<Badge variant="yellow" label={`요청 ${reqs.length}`} />}
        description="계정 권한 유형: 조회 · 카페 열람 · 규제(금칙어/노출제외) · 제재(계정 정지) — 기간 한정 부여 후 자동 회수" />
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
