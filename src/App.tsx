import { useMemo, useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { NavIcon } from '@astryxdesign/core/NavIcon';
import { SideNav, SideNavHeading, SideNavSection, SideNavItem } from '@astryxdesign/core/SideNav';
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
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { List, ListItem } from '@astryxdesign/core/List';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Selector } from '@astryxdesign/core/Selector';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type { PowerSearchConfig, PowerSearchFilter } from '@astryxdesign/core/PowerSearch';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { useResizable, ResizeHandle } from '@astryxdesign/core/Resizable';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import {
  ArrowPathIcon, RocketLaunchIcon, Squares2X2Icon, QueueListIcon,
  FireIcon, RectangleStackIcon, ArrowTrendingUpIcon, CalendarDaysIcon, SparklesIcon,
  ClipboardDocumentCheckIcon, NoSymbolIcon, ShieldExclamationIcon, FlagIcon, UsersIcon, HeartIcon, MagnifyingGlassIcon,
  DevicePhoneMobileIcon, PhotoIcon, BanknotesIcon, ChartBarIcon, KeyIcon, ClipboardDocumentListIcon,
  UserCircleIcon, ArrowRightStartOnRectangleIcon, BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { HomeIcon } from '@heroicons/react/24/solid';
import { Trend } from './views/Trend';
import { Retro } from './views/Retro';
import { Banner } from './views/Banner';
import { Curation } from './views/Curation';
import { Words, BlockList, ReviewQueue, Reports, Reco, Members, Fancafe, AppHome, Profit, Stats, Roles, DeployLog } from './views/Sections';
import { Console360 } from './views/Console360';
import { PageHeader } from './views/PageHeader';
import { Triage } from './views/Triage';
import LoginSSO from './app/login-sso/page';

// ── 메뉴 트리 ──
const NAV = [
  { section: '콘텐츠 운영', items: [
    { key: 'dashboard', label: '대시보드', icon: HomeIcon }, { key: 'popular', label: '노출 인기글 관리', icon: FireIcon },
    { key: 'category', label: '카테고리 인기글', icon: RectangleStackIcon },
    { key: 'trend', label: '카페 트렌드', icon: ArrowTrendingUpIcon }, { key: 'retro', label: '주간 · 월간 인기글', icon: CalendarDaysIcon }, { key: 'reco', label: '추천 컨텐츠 관리', icon: SparklesIcon },
  ]},
  { section: '검수 · 정책', items: [
    { key: 'queue', label: '검수 큐', count: '23', icon: ClipboardDocumentCheckIcon }, { key: 'words', label: '금칙어 · 규제 키워드', icon: NoSymbolIcon },
    { key: 'block', label: '노출제외 · 블랙 관리', icon: ShieldExclamationIcon }, { key: 'report', label: '신고 처리', count: '7', icon: FlagIcon },
  ]},
  { section: '관리', items: [
    { key: 'search', label: '통합 검색 · 360', icon: MagnifyingGlassIcon },
    { key: 'members', label: '개별카페 · 회원 관리', icon: UsersIcon }, { key: 'fancafe', label: '팬카페 관리', icon: HeartIcon },
    { key: 'apphome', label: '모바일앱 · 카페 탑', icon: DevicePhoneMobileIcon }, { key: 'banner', label: '카페배너', icon: PhotoIcon },
  ]},
  { section: '정산 · 분석', items: [{ key: 'profit', label: '수익 · 정산', icon: BanknotesIcon }, { key: 'stat', label: '통계', icon: ChartBarIcon }]},
  { section: '시스템', items: [{ key: 'roles', label: '권한요청', icon: KeyIcon }, { key: 'deploy', label: '배포일지', icon: ClipboardDocumentListIcon }]},
] as const;
const LABELS: Record<string, string> = Object.fromEntries(NAV.flatMap((s) => s.items.map((i) => [i.key, i.label])));

// ── 실제 어드민(노출 인기글 관리) 데이터 구조 ──
type Bg = 'blue' | 'cyan' | 'pink' | 'purple' | 'orange' | 'green' | 'gray';
type Flag = '수정' | '신고' | 'OLD' | 'NEW' | '단어';
type Art = {
  r: number; title: string; cafe: string; cat?: string; emoji: string; bg: Bg;
  uv: number; age: string; flags: Flag[]; reports?: number;
};
// 2026-07-02 10시 실서버 수집분 기준 샘플 (실제 화면 데이터 반영)
const ARTICLES: Art[] = [
  { r: 1, title: '장례식중인 현재 주식 상황', cafe: '여성시대', emoji: '📉', bg: 'gray', uv: 10909, age: '30대', flags: ['수정'] },
  { r: 2, title: '테일러 스위프트 결혼식으로 인해 통제 되는 뉴욕 거리', cafe: '여성시대', emoji: '🗽', bg: 'pink', uv: 4164, age: '30대', flags: ['신고', '수정'], reports: 1 },
  { r: 3, title: '티코 쿠앤크 실물', cafe: '여성시대', cat: '음식', emoji: '🍦', bg: 'cyan', uv: 3819, age: '30대', flags: [] },
  { r: 4, title: '술 끊은 황정민 근황.jpg', cafe: '도탁스', emoji: '🎬', bg: 'blue', uv: 3800, age: '30대', flags: [] },
  { r: 5, title: '반응 좋은 코스트코 신상', cafe: '여성시대', cat: '맛집', emoji: '🛒', bg: 'orange', uv: 3727, age: '30대', flags: ['OLD'] },
  { r: 6, title: '제가 얼굴이 너무 긴데 짧아보였으면 좋겠어요.jpg', cafe: '여성시대', cat: '유머', emoji: '😅', bg: 'purple', uv: 3306, age: '30대', flags: ['OLD'] },
  { r: 7, title: '[속보] 한국에서 백룸 발견', cafe: '여성시대', cat: '유머', emoji: '🚪', bg: 'green', uv: 3185, age: '20대', flags: [] },
  { r: 8, title: '교통사고 구경왔다 끌려가는 태국 강아지', cafe: '여성시대', cat: '동물', emoji: '🐶', bg: 'orange', uv: 2844, age: '30대', flags: ['수정'] },
  { r: 9, title: '하이닉스 종토방 마이클잭슨.jpg', cafe: '도탁스', emoji: '🕺', bg: 'gray', uv: 2843, age: '40대', flags: [] },
  { r: 10, title: '방금 뉴욕 엠파이어 빌딩에서 프로포즈하고 체포된 커플(+사진 추가)', cafe: '여성시대', emoji: '💍', bg: 'pink', uv: 2832, age: '30대', flags: ['수정'] },
  { r: 11, title: '덩치큰 남자로 살고싶다. 육은영 일본갔다가 어깨치기 하는거보고 가서 박아..', cafe: '여성시대', emoji: '🧳', bg: 'purple', uv: 2736, age: '30대', flags: ['수정'] },
  { r: 12, title: '해변에서 모르는 사람과 사진을 찍은 남자친구.jpg', cafe: '도탁스', emoji: '🏖️', bg: 'cyan', uv: 2717, age: '30대', flags: [] },
  { r: 13, title: '해외에서 난리난 요거트 레시피', cafe: '여성시대', cat: '음식', emoji: '🥣', bg: 'green', uv: 2667, age: '30대', flags: [] },
  { r: 14, title: '아이들의 삶이 너무 궁금한 박정민', cafe: '여성시대', emoji: '📚', bg: 'blue', uv: 2589, age: '30대', flags: [] },
  { r: 15, title: '일본 어깨빵남 참교육하는 육은영썜', cafe: '여성시대', emoji: '🥋', bg: 'orange', uv: 2534, age: '30대', flags: [] },
  { r: 16, title: '삼전, 하이닉스 떨어지면 산다는 사람들 근황 . jpg', cafe: '여성시대', cat: '주식', emoji: '📈', bg: 'gray', uv: 2488, age: '30대', flags: [] },
  { r: 17, title: '구) 엘렌페이지 근황', cafe: '도탁스', emoji: '🎥', bg: 'blue', uv: 2454, age: '40대', flags: ['신고'], reports: 1 },
  { r: 18, title: '월드컵 16강 확정후 관중석가서 여자친구와 포옹하는 홀란드', cafe: '이종격투기', cat: '축구', emoji: '⚽', bg: 'blue', uv: 2341, age: '20대', flags: ['NEW'] },
];
// 검수 모드용 추가 수집 후보 (실서버 수집분 규모 재현 — 기존 카페 내에서 생성)
const GEN: [string, string, string, Bg][] = [
  ['출근길에 본 무지개 실화냐', '여성시대', '🌈', 'cyan'], ['우리 동네 맛집 웨이팅 근황', '도탁스', '🍜', 'orange'],
  ['어제 경기 심판 판정 모음', '이종격투기', '🟨', 'blue'], ['요즘 유행하는 패션 조합', '여성시대', '👗', 'pink'],
  ['자취생 냉장고 정리 팁', '여성시대', '🧊', 'green'], ['강아지 유치원 등원 브이로그', '도탁스', '🐕', 'purple'],
  ['주식 계좌 인증 및 후기', '여성시대', '💹', 'gray'], ['신작 드라마 1화 감상평', '여성시대', '📺', 'pink'],
  ['해외축구 이적설 정리', '이종격투기', '🔁', 'blue'], ['다이어트 식단 일주일 기록', '여성시대', '🥗', 'green'],
  ['공포 실화 썰 푼다', '도탁스', '👻', 'purple'], ['부모님 댁 김치 도착.jpg', '여성시대', '🥬', 'orange'],
];
const EXTRA: Art[] = Array.from({ length: 42 }, (_, i) => {
  const g = GEN[i % GEN.length];
  const flags: Flag[] = i % 9 === 0 ? ['수정'] : i % 13 === 4 ? ['신고'] : i % 11 === 7 ? ['OLD'] : [];
  return {
    r: 19 + i, title: g[0] + (i >= GEN.length ? ` ${Math.floor(i / GEN.length) + 1}` : ''), cafe: g[1],
    emoji: g[2], bg: g[3], uv: 2300 - i * 38, age: ['20대', '30대', '40대'][i % 3], flags,
    reports: flags.includes('신고') ? 1 : undefined,
  };
});
const ARTICLES_ALL: Art[] = [...ARTICLES, ...EXTRA];
const INITIAL_EXPOSED: Record<number, boolean> = { 3: true, 7: true, 12: true, 13: true, 18: true };
// 실제 어드민 카테고리 셀렉터 옵션
const CATEGORIES = ['음식', '맛집', '유머', '동물', '주식', '축구', '힐링공감', '사회', '금융', '연예일반', '연예', '가족'];
const CAFES = [...new Set(ARTICLES.map((a) => a.cafe))];
// 실제 어드민의 카페 칩 목록 (0건 카페 포함 노출)
const CHIP_CAFES = ['여성시대', '도탁스', '이종격투기', '텐인텐', '다음맘카페', '樂soccer', '쭉빵 카페', '임영웅 공'];
// 노출 시간대 필터 (실제: 날짜/시각/개수)
const HOURS = ['08시', '09시', '10시', '11시'];
const LIMITS = ['100개', '300개', '500개'];

// 프리뷰 이미지 — 실서비스 썸네일 자리(레퍼런스 파스텔 팔레트 SVG 에셋)
const SVG_BG: Record<Bg, [string, string]> = {
  cyan: ['#EAF0F7', '#D3E2F0'], blue: ['#E8F0FF', '#D1E1FC'], pink: ['#FCE7E9', '#F6D3D8'],
  purple: ['#F0ECFB', '#DFD7F4'], orange: ['#FFF1E6', '#FBE0C8'], green: ['#EAF7EE', '#D5EEDD'], gray: ['#EEF1F4', '#DEE3EA'],
};
const svgThumb = (a: Art) => {
  const [c1, c2] = SVG_BG[a.bg];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='640' height='640' fill='url(#g)'/><circle cx='545' cy='95' r='120' fill='#FFFFFF' opacity='0.35'/><circle cx='105' cy='545' r='85' fill='#FFFFFF' opacity='0.25'/><text x='320' y='390' font-size='190' text-anchor='middle'>${a.emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

const STATUS_LABEL: Record<string, string> = { wait: '노출 대기', issue: '신고 감지', done: '노출 완료' };
const statusOf = (a: Art, exposed: Record<number, boolean>) => (exposed[a.r] ? 'done' : a.reports ? 'issue' : 'wait');
const flagVariant = (f: Flag): 'red' | 'orange' | 'blue' | 'purple' | 'neutral' => (f === '신고' ? 'red' : f === '수정' ? 'orange' : f === 'NEW' ? 'blue' : f === '단어' ? 'purple' : 'neutral');
// 카드별 노출 옵션 (실제: 댓글 / 뉴스펌 / 썸네일 / 풀 제외)
type Opts = { cmt: boolean; news: boolean; thumb: boolean; full: boolean };
const DEFAULT_OPTS: Opts = { cmt: true, news: false, thumb: true, full: false };

function FlagBadges({ a }: { a: Art }) {
  return <>{a.flags.map((f) => <Badge key={f} variant={flagVariant(f)} label={f === '신고' ? `신고 ${a.reports ?? 1}` : f} />)}</>;
}

const ACTIVITY: [string, string, string][] = [
  ['"호텔키 반납 깜빡" 최종 승인', '박검수 · 여성시대', '15:12'], ['2차 검수 완료 — 카드 3건', '박검수', '15:10'],
  ['악성 키워드 글 영구 제외', '김운영 · 자동 규칙 G2', '14:58'], ['금칙어 "은어" Lv.1 등록', '최관리', '14:32'],
  ['10시 자동 배치 리스트업 (500건)', '시스템', '10:00'],
];

function Thumb({ a }: { a: Art }) {
  return <Thumbnail src={svgThumb(a)} alt={a.title} label={a.title} style={{ width: 48, height: 48 }} />;
}

// 대시보드 — 액션 큐형 재구성: ① 오늘 해야 할 일(클릭=이동) ② 이상 신호(예외만) ③ 어제의 성과 ④ 활동 로그(축소)
function Dashboard({ onGo }: { onGo: (v: string) => void }) {
  const todo = [
    { k: 'popular', t: '이번 시간대 인기글', d: '노출 48/50 · 다음 배치 02:34 전 2건 부족', urgent: true },
    { k: 'category', t: '카테고리 인기글', d: '오늘 스토리 4/5 완료 · 미발행 1건', urgent: false },
    { k: 'queue', t: '검수 · 신고', d: '검수 23건 · 신고 7건 · SLA 초과 2건', urgent: true },
    { k: 'banner', t: '카페배너', d: '오늘 종료 2건 · 미배포 변경 있음', urgent: false },
  ];
  const signals: { v: 'warning' | 'error'; t: string; d: string; k: string }[] = [
    { v: 'warning', t: '위험 키워드 신규 감지 2건', d: '카페 트렌드 → 제거 대기', k: 'trend' },
    { v: 'error', t: '신고 급증 게시글 1건', d: '1시간 내 신고 5건 동반', k: 'report' },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="대시보드" description="2026. 07. 02 (목) · 09:00–21:00 운영 중" />
      <VStack gap={2}>
        <Heading level={4}>오늘 해야 할 일</Heading>
        <Grid columns={{ minWidth: 250 }} gap={3}>
          {todo.map((c) => (
            <Card key={c.k} padding={4}>
              <VStack gap={2} height="100%">
                <HStack gap={2} vAlign="center"><Text weight="semibold">{c.t}</Text>{c.urgent && <Badge variant="red" label="긴급" />}</HStack>
                <StackItem size="fill"><Text type="supporting" color="secondary">{c.d}</Text></StackItem>
                <Button label="바로가기" variant="secondary" size="sm" onClick={() => onGo(c.k)} />
              </VStack>
            </Card>
          ))}
        </Grid>
      </VStack>
      <VStack gap={2}>
        <Heading level={4}>이상 신호</Heading>
        <Card padding={0}>
          <List hasDividers density="balanced">
            {signals.map((s) => (
              <ListItem key={s.t} label={s.t} description={s.d}
                startContent={<StatusDot variant={s.v} label={s.t} />}
                endContent={<Button label="확인" variant="ghost" size="sm" onClick={() => onGo(s.k)} />} />
            ))}
            <ListItem label="배치 파이프라인 정상 · 트롬 자동 승인 1,247/1,500" description="이상 없음 — 실패 시에만 여기로 올라옵니다"
              startContent={<StatusDot variant="success" label="정상" />} />
          </List>
        </Card>
      </VStack>
      <VStack gap={2}>
        <Heading level={4}>어제의 성과</Heading>
        <Grid columns={{ minWidth: 200 }} gap={3}>
          {([['노출 인기글 UV 합', '412만', '+3.2%'], ['카테고리 인기글 클릭', '24,860', '+6.1%'], ['주간 트렌드', '직관후기 ▲320%', '']] as const).map(([l, v, s]) => (
            <Card key={l} padding={5}><VStack gap={1}><Text type="supporting">{l}</Text><HStack gap={2} vAlign="end"><Heading level={3}>{v}</Heading>{s && <Badge variant="green" label={s} />}</HStack></VStack></Card>
          ))}
        </Grid>
      </VStack>
      <Card padding={5}>
        <List density="compact" hasDividers header={<Heading level={4}>최근 운영 활동</Heading>}>
          {ACTIVITY.slice(0, 3).map((x, i) => (
            <ListItem key={i} label={x[0]} description={x[1]} endContent={<Text type="supporting" color="secondary">{x[2]}</Text>} />
          ))}
        </List>
      </Card>
    </VStack>
  );
}

// 상세 본문 — 실제 카드 컨트롤(노출 옵션 + 카테고리 + 노출) 포함
function DetailBody({ sel, exposed, opts, cats, onExpose, onOpt, onCat, onClose }: {
  sel: Art; exposed: Record<number, boolean>; opts: Record<number, Opts>; cats: Record<number, string>;
  onExpose: (a: Art) => void; onOpt: (r: number, k: keyof Opts, v: boolean) => void; onCat: (r: number, c: string | null) => void; onClose: () => void;
}) {
  const o = opts[sel.r] ?? DEFAULT_OPTS;
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" justify="between">
        <Heading level={4}>게시글 상세</Heading>
        <IconButton label="닫기" variant="ghost" size="sm" icon={<Icon icon="close" size="sm" />} onClick={onClose} />
      </HStack>
      <Thumbnail src={svgThumb(sel)} alt={sel.title} label={sel.title} style={{ width: '100%', height: 'auto' }} />
      <VStack gap={1}>
        <HStack gap={1} wrap="wrap" vAlign="center"><Badge variant="blue" label={`${sel.r}위`} /><FlagBadges a={sel} /></HStack>
        <Text weight="semibold">{sel.title}</Text>
        <HStack gap={2}><Text type="supporting" color="accent">{sel.cafe}</Text><Text type="supporting" color="secondary">UV {sel.uv.toLocaleString()}</Text></HStack>
      </VStack>
      <Divider />
      <MetadataList columns="single" title="지표">
        <MetadataListItem label="순위">{sel.r}위</MetadataListItem>
        <MetadataListItem label="UV">{sel.uv.toLocaleString()}</MetadataListItem>
        <MetadataListItem label="주 연령대">{sel.age}</MetadataListItem>
        <MetadataListItem label="상태"><Badge variant={exposed[sel.r] ? 'success' : sel.reports ? 'yellow' : 'neutral'} label={STATUS_LABEL[statusOf(sel, exposed)]} /></MetadataListItem>
      </MetadataList>
      <Divider />
      <VStack gap={2}>
        <Text type="label">노출 옵션</Text>
        <HStack gap={4} wrap="wrap">
          <CheckboxInput label="댓글" value={o.cmt} onChange={(v) => onOpt(sel.r, 'cmt', v)} />
          <CheckboxInput label="뉴스펌" value={o.news} onChange={(v) => onOpt(sel.r, 'news', v)} />
          <CheckboxInput label="썸네일" value={o.thumb} onChange={(v) => onOpt(sel.r, 'thumb', v)} />
          <CheckboxInput label="풀 제외" value={o.full} onChange={(v) => onOpt(sel.r, 'full', v)} />
        </HStack>
        <Selector label="카테고리" isLabelHidden size="sm" placeholder="카테고리 미선택" hasClear
          options={CATEGORIES} value={cats[sel.r] ?? undefined} onChange={(v) => onCat(sel.r, v)} />
      </VStack>
      <Divider />
      {exposed[sel.r]
        ? <HStack gap={2} vAlign="center"><StatusDot variant="success" label="노출 완료" /><Text type="supporting" color="secondary">10:00 노출 · halo.axz</Text></HStack>
        : <Button label="노출하기" variant="primary" onClick={() => onExpose(sel)} />}
    </VStack>
  );
}

function Popular() {
  const [filters, setFilters] = useState<ReadonlyArray<PowerSearchFilter>>([]);
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'cafe'>('none');
  const [viewMode, setViewMode] = useState<'triage' | 'card' | 'list'>('triage');
  const [excluded, setExcluded] = useState<Record<number, boolean>>({});
  const [moved, setMoved] = useState<Record<number, boolean>>({});
  const [cafeChip, setCafeChip] = useState<string | null>(null);
  const [hour, setHour] = useState('10시');
  const [limit, setLimit] = useState('500개');
  const [sel, setSel] = useState<Art | null>(ARTICLES[0]);
  const [exposed, setExposed] = useState<Record<number, boolean>>(INITIAL_EXPOSED);
  const [opts, setOpts] = useState<Record<number, Opts>>({});
  const [cats, setCats] = useState<Record<number, string>>(Object.fromEntries(ARTICLES.filter((a) => a.cat).map((a) => [a.r, a.cat!])));
  const isNarrow = useMediaQuery('(max-width: 1200px)');
  const panel = useResizable({ defaultSize: 320, minSizePx: 280, maxSizePx: 460 });

  const toggleExpose = (a: Art) => setExposed((e) => ({ ...e, [a.r]: !e[a.r] }));
  const setOpt = (r: number, k: keyof Opts, v: boolean) => setOpts((m) => ({ ...m, [r]: { ...(m[r] ?? DEFAULT_OPTS), [k]: v } }));
  const setCat = (r: number, c: string | null) => setCats((m) => { const n = { ...m }; if (c) n[r] = c; else delete n[r]; return n; });

  const exposedCount = ARTICLES_ALL.filter((a) => exposed[a.r]).length;
  const excludedCount = ARTICLES_ALL.filter((a) => excluded[a.r]).length;
  const movedCount = ARTICLES_ALL.filter((a) => moved[a.r]).length;

  const filtered = useMemo(() => {
    try {
      return ARTICLES_ALL.filter((a) => !excluded[a.r] && !moved[a.r]).filter((a) => (!cafeChip || a.cafe === cafeChip)).filter((a) =>
        filters.every((f) => {
          const key = (f as never as { field: string }).field;
          const raw = (f as never as { value: unknown }).value;
          const val = typeof raw === 'object' && raw ? (raw as { value?: string }).value : raw;
          if (!key || val == null) return true;
          if (key === 'cafe') return a.cafe === val;
          if (key === 'cat') return cats[a.r] === val;
          if (key === 'status') return statusOf(a, exposed) === val;
          return true;
        }),
      ).sort((x, y) => x.r - y.r);
    } catch { return ARTICLES_ALL; }
  }, [filters, exposed, excluded, moved, cafeChip, cats]);

  const groups = useMemo(() => {
    const m = new Map<string, Art[]>();
    if (groupBy === 'none') { m.set('전체', filtered); return m; }
    const order = groupBy === 'status' ? ['wait', 'issue', 'done'] : CAFES;
    order.forEach((k) => m.set(k, []));
    filtered.forEach((a) => { const k = groupBy === 'status' ? statusOf(a, exposed) : a.cafe; (m.get(k) ?? m.set(k, []).get(k)!).push(a); });
    return m;
  }, [filtered, groupBy, exposed]);

  const config: PowerSearchConfig = {
    name: 'PopularSearch',
    fields: [
      { key: 'status', label: '상태', operators: [{ key: 'is', label: 'is', value: { type: 'enum', values: [{ value: 'wait', label: '노출 대기' }, { value: 'issue', label: '신고 감지' }, { value: 'done', label: '노출 완료' }] } }] },
      { key: 'cafe', label: '카페', operators: [{ key: 'is', label: 'is', value: { type: 'enum', values: CAFES.map((c) => ({ value: c, label: c })) } }] },
      { key: 'cat', label: '카테고리', operators: [{ key: 'is', label: 'is', value: { type: 'enum', values: CATEGORIES.map((c) => ({ value: c, label: c })) } }] },
    ],
  };

  const statusDotVariant = (k: string): 'success' | 'warning' | 'neutral' => (k === 'done' ? 'success' : k === 'issue' ? 'warning' : 'neutral');
  const columns: TableColumn<Art>[] = [
    { key: 'r', header: '순위', width: pixel(52), renderCell: (a) => <Text weight="bold">{a.r}</Text> },
    { key: 'expose', header: '노출', width: pixel(56), renderCell: (a) => (
      <CheckboxInput label="노출" isLabelHidden value={!!exposed[a.r]} onChange={() => toggleExpose(a)} />
    ) },
    { key: 'title', header: '게시글 제목', width: proportional(1), renderCell: (a) => (
      <HStack gap={3} vAlign="center"><Thumb a={a} />
        <VStack gap={0}>
          <HStack gap={1} vAlign="center" wrap="wrap"><FlagBadges a={a} /><Text weight="medium" maxLines={1}>{a.title}</Text></HStack>
          <Text type="supporting" color="secondary">{a.cafe}{cats[a.r] ? ' · ' + cats[a.r] : ''}</Text>
        </VStack>
      </HStack>
    ) },
    { key: 'age', header: '주 연령', width: pixel(68), align: 'end', renderCell: (a) => <Badge variant="neutral" label={a.age} /> },
    { key: 'uv', header: 'UV', width: pixel(76), align: 'end', renderCell: (a) => <Text type="supporting">{a.uv.toLocaleString()}</Text> },
    { key: 'cat', header: '카테고리', width: pixel(150), renderCell: (a) => (
      <Selector label="카테고리" isLabelHidden size="sm" placeholder="미선택" hasClear
        options={CATEGORIES} value={cats[a.r] ?? undefined} onChange={(v) => setCat(a.r, v)} />
    ) },
    { key: 'act', header: '관리', width: pixel(72), align: 'end', renderCell: (a) => (
      <Button label="상세" variant="secondary" size="sm" onClick={() => setSel(a)} />
    ) },
  ];

  // 카드형 — 실제 어드민 카드(썸네일 + 배지 + 노출 옵션 + 카테고리 + 노출 버튼)
  const renderCard = (a: Art) => {
    const o = opts[a.r] ?? DEFAULT_OPTS;
    return (
      <Card key={a.r} padding={4}>
        <VStack gap={3} height="100%">
          <Thumbnail src={svgThumb(a)} alt={a.title} label={a.title} onClick={() => setSel(a)} style={{ width: '100%', height: 'auto' }} />
          <HStack gap={1} wrap="wrap" vAlign="center"><Badge variant="blue" label={`${a.r}위`} /><FlagBadges a={a} /></HStack>
          <StackItem size="fill">
            <VStack gap={1}>
              <Text weight="medium" maxLines={2}>{a.title}</Text>
              <HStack gap={2}><Text type="supporting" color="accent">{a.cafe}</Text><Text type="supporting" color="secondary">UV {a.uv.toLocaleString()}</Text></HStack>
            </VStack>
          </StackItem>
          <HStack gap={3} wrap="wrap">
            <CheckboxInput label="댓글" value={o.cmt} onChange={(v) => setOpt(a.r, 'cmt', v)} />
            <CheckboxInput label="뉴스펌" value={o.news} onChange={(v) => setOpt(a.r, 'news', v)} />
            <CheckboxInput label="썸네일" value={o.thumb} onChange={(v) => setOpt(a.r, 'thumb', v)} />
            <CheckboxInput label="풀 제외" value={o.full} onChange={(v) => setOpt(a.r, 'full', v)} />
          </HStack>
          <Selector label="카테고리" isLabelHidden size="sm" placeholder="카테고리 미선택" hasClear
            options={CATEGORIES} value={cats[a.r] ?? undefined} onChange={(v) => setCat(a.r, v)} />
          <Button label={exposed[a.r] ? '노출완료' : '노출하기'} variant={exposed[a.r] ? 'secondary' : 'primary'} onClick={() => toggleExpose(a)} />
        </VStack>
      </Card>
    );
  };
  const groupContent = (r: Art[]) => viewMode === 'list'
    ? <Card padding={0}><Table<Art> data={r} columns={columns} idKey="r" density="balanced" dividers="rows" hasHover /></Card>
    : <Grid columns={{ minWidth: 240 }} gap={3}>{r.map(renderCard)}</Grid>;

  const groupLabel = (k: string) => groupBy === 'status' ? STATUS_LABEL[k] : k;
  const rows = [...groups.entries()].filter(([, r]) => r.length > 0);
  const chipCount = (c: string) => ARTICLES_ALL.filter((a) => a.cafe === c).length;

  // 검수 모드 — AI 추천 카테고리(확정된 값 우선 + 결정적 추천 2개) + 큐 매핑
  const suggest = (a: Art): string[] => {
    const h = a.title.length * 31 + a.r * 7;
    const picks = [a.cat ?? cats[a.r] ?? CATEGORIES[h % CATEGORIES.length], CATEGORIES[(h + 3) % CATEGORIES.length], CATEGORIES[(h + 7) % CATEGORIES.length]];
    return [...new Set(picks)].slice(0, 3);
  };
  const triageItems = filtered.filter((a) => !exposed[a.r]).map((a) => ({
    r: a.r, title: a.title, cafe: a.cafe, uv: a.uv, flags: a.flags as string[],
    thumb: svgThumb(a), cat: cats[a.r], catSuggest: suggest(a),
  }));

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={5}>
          <VStack gap={4}>
            <PageHeader
              title="2026-07-02 10시의 인기글"
              meta={<>
                <HStack gap={1} vAlign="center"><StatusDot variant="success" isPulsing label="노출 중" tooltip="실제 노출 시간대" /><Text type="supporting" color="secondary">노출 중</Text></HStack>
                <Badge variant="red" label={`노출개수 ${exposedCount + 43}`} />
                <Badge variant="blue" label={`이동완료글 ${movedCount}개`} />
              </>}
              description="2026-07-02 08시 30분 ~ 09시 30분까지 수집된 인기 게시글 후보"
              actions={<>
                <Button label="새로고침" variant="secondary" size="md" icon={<Icon icon={ArrowPathIcon} size="sm" />} />
                <Button label="노출완료 보기" variant="secondary" size="md" icon={<Icon icon="check" size="sm" />} />
                <Button label="Tromm 배포" variant="primary" size="md" icon={<Icon icon={RocketLaunchIcon} size="sm" />} />
              </>}
            />
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Selector label="수집 시각" isLabelHidden size="md" options={HOURS} value={hour} onChange={(v) => v && setHour(v)} />
              <Selector label="수집 개수" isLabelHidden size="md" options={LIMITS} value={limit} onChange={(v) => v && setLimit(v)} />
              <StackItem size="fill">
                <PowerSearch config={config} filters={filters} onChange={(f) => setFilters(f)} placeholder="상태 · 카페 · 카테고리 · 글 제목으로 필터…" resultCount={`${filtered.length}건`} />
              </StackItem>
              <SegmentedControl value={groupBy} onChange={(v) => setGroupBy(v as never)} label="그룹 기준" size="md">
                <SegmentedControlItem value="none" label="순위순" />
                <SegmentedControlItem value="status" label="상태" />
                <SegmentedControlItem value="cafe" label="카페" />
              </SegmentedControl>
              <SegmentedControl value={viewMode} onChange={(v) => setViewMode(v as never)} label="보기 방식" size="md">
                <SegmentedControlItem value="triage" label="검수 모드" icon={<Icon icon={ClipboardDocumentCheckIcon} size="sm" />} />
                <SegmentedControlItem value="card" label="카드형" icon={<Icon icon={Squares2X2Icon} size="sm" />} />
                <SegmentedControlItem value="list" label="목록형" icon={<Icon icon={QueueListIcon} size="sm" />} />
              </SegmentedControl>
            </HStack>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <ToggleButton size="sm" label={`전체카페 ${ARTICLES_ALL.length}`} isPressed={cafeChip === null} onPressedChange={() => setCafeChip(null)} />
              {CHIP_CAFES.map((c) => (
                <ToggleButton key={c} size="sm" label={`${c} ${chipCount(c)}`} isPressed={cafeChip === c} onPressedChange={(p) => setCafeChip(p ? c : null)} />
              ))}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={5}>
          <VStack gap={4}>
            {viewMode === 'triage' && (
              <Triage items={triageItems} categories={CATEGORIES}
                processed={exposedCount + excludedCount + movedCount} total={ARTICLES_ALL.length}
                counts={{ exposed: exposedCount, moved: movedCount, excluded: excludedCount }}
                onExpose={(r) => setExposed((e) => ({ ...e, [r]: true }))}
                onMove={(r) => setMoved((m) => ({ ...m, [r]: true }))}
                onExclude={(r) => setExcluded((e) => ({ ...e, [r]: true }))}
                onCat={(r, c) => setCat(r, c)} />
            )}
            {viewMode !== 'triage' && rows.map(([key, r]) => (
              groupBy === 'none'
                ? <StackItem key={viewMode + key}>{groupContent(r)}</StackItem>
                : <Collapsible key={groupBy + viewMode + key} defaultIsOpen trigger={
                    <HStack gap={2} vAlign="center"><StatusDot variant={statusDotVariant(key)} label={groupLabel(key)} /><Text weight="bold">{groupLabel(key)}</Text><Badge variant="neutral" label={String(r.length)} /></HStack>
                  }>
                    {groupContent(r)}
                  </Collapsible>
            ))}
            {viewMode !== 'triage' && isNarrow && sel && (<><Divider /><DetailBody sel={sel} exposed={exposed} opts={opts} cats={cats} onExpose={toggleExpose} onOpt={setOpt} onCat={setCat} onClose={() => setSel(null)} /></>)}
          </VStack>
        </LayoutContent>
      }
      end={viewMode !== 'triage' && !isNarrow && sel && (
        <>
          <ResizeHandle resizable={panel.props} isReversed isAlwaysVisible={false} />
          <LayoutPanel hasDivider label="게시글 상세" resizable={panel.props as never}>
            <DetailBody sel={sel} exposed={exposed} opts={opts} cats={cats} onExpose={toggleExpose} onOpt={setOpt} onCat={setCat} onClose={() => setSel(null)} />
          </LayoutPanel>
        </>
      )}
    />
  );
}

function Soon({ title }: { title: string }) {
  return (
    <VStack gap={4}><PageHeader title={title} />
      <Card padding={8}>
        <EmptyState icon={<Icon icon={Squares2X2Icon} />} title={`${title} 준비 중`}
          description="이 섹션은 통합 어드민 개편 대상입니다. 동일 디자인 시스템으로 순차 구현됩니다."
          actions={<Button label="개편 로드맵 보기" variant="secondary" />} />
      </Card>
    </VStack>
  );
}

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [view, setView] = useState('popular');
  const isFill = view === 'popular' || view === 'category';

  // 로그인 게이트 — 사내 SSO (login-sso 템플릿)
  if (!user) return <LoginSSO onLogin={setUser} />;

  return (
    <AppShell
      height="fill" variant="elevated" contentPadding={isFill ? 0 : 6}
      sideNav={
        <SideNav
          header={
            <SideNavHeading
              icon={<NavIcon icon={<BuildingStorefrontIcon style={{ width: 16, height: 16 }} />} />}
              heading="cafe ADM" subheading="통합 운영 어드민"
            />
          }
          collapsible>
          {NAV.map((s) => (
            <SideNavSection key={s.section} title={s.section}>
              {s.items.map((it) => (
                <SideNavItem key={it.key} label={it.label} icon={it.icon} isSelected={view === it.key} onClick={() => setView(it.key)}
                  endContent={'count' in it && it.count ? <Badge variant="neutral" label={it.count} /> : undefined} />
              ))}
            </SideNavSection>
          ))}
          <SideNavSection title="계정">
            <SideNavItem label={`박상욱 · SUPERADMIN`} icon={UserCircleIcon} endContent={<Badge variant="neutral" label={user} />} />
            <SideNavItem label="로그아웃" icon={ArrowRightStartOnRectangleIcon} onClick={() => setUser(null)} />
          </SideNavSection>
        </SideNav>
      }
    >
      {view === 'dashboard' ? <Dashboard onGo={setView} /> : view === 'popular' ? <Popular />
        : view === 'category' ? <Curation />
        : view === 'trend' ? <Trend /> : view === 'retro' ? <Retro /> : view === 'banner' ? <Banner />
        : view === 'queue' ? <ReviewQueue /> : view === 'words' ? <Words /> : view === 'block' ? <BlockList /> : view === 'report' ? <Reports />
        : view === 'reco' ? <Reco /> : view === 'search' ? <Console360 /> : view === 'members' ? <Members /> : view === 'fancafe' ? <Fancafe /> : view === 'apphome' ? <AppHome />
        : view === 'profit' ? <Profit /> : view === 'stat' ? <Stats /> : view === 'roles' ? <Roles /> : view === 'deploy' ? <DeployLog />
        : <Soon title={LABELS[view] ?? '섹션'} />}
    </AppShell>
  );
}
