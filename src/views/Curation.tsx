import { useMemo, useState } from 'react';
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
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Selector } from '@astryxdesign/core/Selector';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { useResizable, ResizeHandle } from '@astryxdesign/core/Resizable';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { SparklesIcon, ArrowUpTrayIcon, RocketLaunchIcon, PlusIcon } from '@heroicons/react/24/outline';
import { PageHeader } from './PageHeader';
import { fmt, emojiThumb } from './shared';

// ── 카테고리 인기글 큐레이션 (실제 어드민 favoritearticle/tag + popular/category/manage + 운영 엑셀 로직 통합) ──
// 흐름: ① 소재 수집(CMS 태그 자동) → ② AI 초안(자동 채움) → ③ 검수(플래그 확인·교체) → ④ 발행(등록)

type Story = { id: number; title: string; cat: string; target: number; clicks?: number; fixed?: boolean };
const INITIAL_STORIES: Story[] = [
  { id: 1, title: '머리 한 번 묶었을 뿐인데 분위기 완성💇', cat: '연예', target: 10, clicks: 6540 },
  { id: 2, title: '평면도만 봐도 흥미로운 집 구조 탐구📐', cat: '리빙', target: 10, clicks: 4210 },
  { id: 3, title: '여권 하나로 펼쳐지는 별별 이야기✈️', cat: '여행', target: 8 },
  { id: 4, title: '과거 폼 미쳤던 비주얼 스타들 클라스✨', cat: '연예', target: 10 },
  { id: 5, title: '결혼은 다 똑같다? 미리 보는 찐 현실👀', cat: '펀', target: 10 },
];
// 발행 완료된 과거 일자 (실제 2025.12 달력 데이터)
const fixedStory = (id: number, title: string, cat: string, target: number, clicks: number): Story => ({ id, title, cat, target, clicks, fixed: true });
const INITIAL_DAYS: Record<number, Story[]> = {
  1: INITIAL_STORIES,
  2: [fixedStory(21, '이거 보면 레이어드컷 바로 하러 감✂️', '뷰티', 10, 5120), fixedStory(22, '웨딩사진이 이렇게 예쁘면 반칙💒', '펀', 10, 4870), fixedStory(23, '방금 출근했는데 벌써 퇴근 마렵다', '펀', 9, 4550), fixedStory(24, '금손들의 뜨개 세계, 오늘도 경이롭다🧶', '취미', 10, 3980), fixedStory(25, '카메라 착붙! 연예인 피부력 모음', '연예', 10, 5230)],
  3: [fixedStory(31, '웨딩사진이 이렇게 예쁘면 반칙💒', '펀', 10, 4610), fixedStory(32, '읽기만 해도 현웃 터지는 가족 카톡', '펀', 9, 5340), fixedStory(33, '누가 봐도 인정할 수밖에 없는 조합', '푸드', 10, 4120), fixedStory(34, '예뻐지고 싶은 마음은 알지만…', '뷰티', 10, 3890), fixedStory(35, '좋긴 좋은데, 너무 유명해지긴 싫어', '펀', 10, 4460)],
  8: [fixedStory(81, '하얗게 불태운 연말 스포츠 씬 ❤️', '스포츠', 6, 3720), fixedStory(82, '라떼는 말야, 그 시절 감성모음 📼', '펀', 7, 4210), fixedStory(83, '펑펑내리는 눈과 함께나는 겨울 감성❄️', '리빙', 8, 3950), fixedStory(84, '머리 한 번 묶었을 뿐인데 분위기 완성💇', '연예', 10, 5870), fixedStory(85, '연말 시그니처 케이크 축제🎂🎄', '푸드', 8, 4680)],
  9: [fixedStory(91, '요즘 맛도리 디저트 모음집 🍰', '푸드', 12, 5510), fixedStory(92, '게임할 때 공감되는 그 순간들🎮', '게임', 11, 4230), fixedStory(93, '귀여운 가나디들의 일상 🐕', '동물', 10, 6120), fixedStory(94, '평면도만 봐도 설레는 꿈의 집 구경', '리빙', 10, 4390), fixedStory(95, '연말 시그니처 케이크 축제🎂🎄', '푸드', 6, 3540)],
  10: [fixedStory(101, '누가 봐도 인정할 수밖에 없는 조합', '푸드', 10, 4470), fixedStory(102, '라떼는 말야, 그 시절 감성모음 📼', '펀', 7, 3980), fixedStory(103, '평면도만 봐도 설레는 꿈의 집 구경', '리빙', 10, 4150), fixedStory(104, '귀여운 가나디들의 일상 🐕', '동물', 10, 5730), fixedStory(105, '게임할 때 공감되는 그 순간들🎮', '게임', 11, 3870)],
  11: [fixedStory(111, '폼 미친 연말 시상식 모음 🎬', '연예', 7, 5090), fixedStory(112, '하얗게 불태운 연말 스포츠 씬 ❤️', '스포츠', 6, 3480), fixedStory(113, '펑펑내리는 눈과 함께나는 겨울 감성❄️', '리빙', 8, 3760), fixedStory(114, '요즘 맛도리 디저트 모음집 🍰', '푸드', 12, 5210), fixedStory(115, '누가 봐도 인정할 수밖에 없는 조합', '푸드', 10, 4020)],
};

// 자동 검수 플래그 — 운영 엑셀 '게시글 서칭 방법' 주의사항을 규칙化
type Flag = '미러링' | '여혐주의' | '비공개위험' | 'OLD' | '단어';
type Mat = { id: number; title: string; cafe: string; tag: string; emoji: string; c1: string; c2: string; clicks: number; flags: Flag[]; storyId?: number; ai?: boolean };
const P: Record<string, [string, string]> = {
  연예: ['#FCE7E9', '#F6D3D8'], 리빙: ['#EAF7EE', '#D5EEDD'], 여행: ['#E8F0FF', '#D1E1FC'], 펀: ['#FDEAF0', '#F6D3E0'],
  푸드: ['#FFF1E6', '#FBE0C8'], 취미: ['#F0ECFB', '#DFD7F4'], 스포츠: ['#E8F0FF', '#D1E1FC'], 머니: ['#EAF0F7', '#D3E2F0'],
};
const m = (id: number, title: string, cafe: string, tag: string, emoji: string, clicks: number, flags: Flag[] = [], storyId?: number): Mat =>
  ({ id, title, cafe, tag, emoji, c1: (P[tag] ?? P['펀'])[0], c2: (P[tag] ?? P['펀'])[1], clicks, flags, storyId });
// 소재 풀 — CMS 태그 인기글 수집분 (실제 화면 데이터 기반)
const INITIAL_MATS: Mat[] = [
  m(1, '더시즌즈에서 헤메코 진짜 정성이었던 mc', '여성시대', '연예', '💇', 812, ['미러링'], 1),
  m(2, '포니테일 스타일 각자 다 다른 미야오 스타일링.jpg', '여성시대', '연예', '🎀', 748, ['미러링'], 1),
  m(3, '반머리 묶음 스타일 한 크리스탈.insta', '소주담(談)', '연예', '📸', 691, ['비공개위험'], 1),
  m(4, '묶음머리 아이유.gif', '樂soccer', '연예', '🎤', 655, ['여혐주의'], 1),
  m(5, '여신같은 묶음머리 에스파 카리나.jpg', '樂soccer', '연예', '✨', 620, ['여혐주의'], 1),
  m(6, '잊지 유나 포니테일 헤어', '한류열풍 사랑', '연예', '💫', 584, [], 1),
  m(7, '평면도만 봐도 흥미로운 집 구경.jpg', '여성시대', '리빙', '🏠', 530, ['미러링'], 2),
  m(8, '오일 새어나와부러요', '농기계 사용자', '리빙', '🛢️', 471, [], 2),
  m(9, '오랜만에 새끼자랑 합니다.', '전통음식만들기', '리빙', '🌱', 448, [], 2),
  m(10, '혼자서도 잘 사는, 서른살 내 집마련기.jpg', '여성시대', '리빙', '🔑', 512, ['미러링']),
  m(11, '인테리어 자취방 조명 바꾼 후기', '여성시대', '리빙', '💡', 489, ['미러링']),
  m(12, '여기서 하나쯤은 마음에 드는 취미가 있겠지 (니항컨)', '여성시대', '취미', '🧶', 402, ['미러링']),
  m(13, '호주 워킹홀리데이에 대한 모든 것 (자주 묻는 질문)', '여성시대', '여행', '🇦🇺', 615, ['미러링']),
  m(14, '여권 사진 잘 나오는 꿀팁', '쭉빵카페', '여행', '🛂', 577, ['미러링']),
  m(15, '유고연방 해체 이후 7개국', '홀리건 천국', '여행', '🗺️', 486, []),
  m(16, '독일 검찰, 독일 축구협회 압수수색', '홀리건 천국', '스포츠', '⚽', 455, []),
  m(17, '배재고 건드렸다가 역풍 맞게 된다는 블라인드', '홀리건 천국', '펀', '📰', 703, []),
  m(18, '[단독] "손흥민·이재성 선발 빠진 이유는…" 홍명보 남아공전 구상', '홀리건 천국', '스포츠', '🏟️', 668, []),
  m(19, '과거 폼 미쳤던 비주얼 스타들 클라스✨', '쭉빵카페', '연예', '🌟', 641, ['미러링']),
  m(20, '레전드 리즈 시절 배우 모음.zip', '이종격투기', '연예', '🎬', 599, ['여혐주의']),
  m(21, '결혼 3년차가 말하는 현실 결혼생활', '여성시대', '펀', '💍', 587, ['미러링']),
  m(22, '결혼식 축의금 정리표.jpg', '도탁스', '펀', '💌', 542, ['여혐주의']),
  m(23, '진짜 책 못읽겠는사람 6분독서법 하면 좋음돠', '여성시대', '취미', '📚', 388, ['미러링', 'OLD']),
  m(24, '수잔 밀러 > 7월 첫째 주 별자리 운세', '여성시대', '펀', '🔮', 356, ['미러링']),
  m(25, '의외로 만족도 높았던 대체 뷰티템', '여성시대', '리빙', '💄', 429, ['미러링']),
  m(26, '원-달러 1,550원 돌파 직전 상황', '홀리건 천국', '머니', '💱', 517, ['단어']),
  m(27, '이상준님 미백찰옥수수 후기', '전통음식만들기2', '푸드', '🌽', 397, ['OLD']),
  m(28, '안성 국사봉 백패킹 | 궁예도 쉬어 간 곳 | 역대급 운해', 'Backcountry Camping', '취미', '⛺', 373, []),
  // 운영 엑셀 '카테고리 인기글' 시트 실데이터 (일일클릭 실측치)
  m(29, '오늘 전소미가 올린 부모님 과거 사진........jpg', '내가 아는 카페', '연예', '📷', 1338, ['비공개위험']),
  m(30, '부모님에 비해서는 키 작은편이라 볼 수 있는 젠데이아', '여성시대', '연예', '🌟', 872, ['미러링']),
  m(31, '다니엘 헤니가 인스타에 올린 부모님 사진.jpg', '여성시대', '연예', '📸', 812, ['미러링']),
  m(32, '혜리 부모님 젊은 시절 & 인생 네컷', '한류열풍 사랑', '연예', '🎞️', 777, []),
  m(33, '연예인들의 부모님 사진', 'I Love NBA', '연예', '👨‍👩‍👧', 754, []),
  m(34, '부모님 과거 사진 공개한 티아라 지연', '이종격투기', '연예', '💜', 729, ['여혐주의']),
  m(35, '엄마 많이 닮은 켄달 제너', '樂soccer', '연예', '👩', 712, ['여혐주의']),
  m(36, '김종국 부모님이 자식들에게 물려준다는 재산', '樂soccer', '연예', '💪', 648, ['여혐주의']),
  m(37, '한국인에게는 세 번의 새해가 있어', '쭉빵카페', '펀', '🎆', 630, ['미러링']),
  m(38, '새해 첫날 쿠팡기사님의 감동멘트', '쭉빵카페', '펀', '📦', 614, ['미러링']),
  m(39, '나 11살때 새해 카톡 보내기 귀찮아서', '밀리토리네', '펀', '💬', 467, ['OLD']),
  m(40, '새해 첫곡 진짜 중요한거같음', '여성시대', '펀', '🎵', 464, ['미러링']),
  m(41, '커플들이 도전 해볼만한 새해 커플사진', '도탁스', '펀', '💑', 424, ['여혐주의']),
  m(42, '1월1일 헬스장 풍경', '이종격투기', '펀', '🏋️', 355, ['여혐주의']),
  m(43, '새해 결심 삼형제', '우정잉 팬까페 잉친쓰', '펀', '🤝', 259, []),
  m(44, '원룸 공간활용 만렙 배치도 모음', '여성시대', '리빙', '📐', 566, ['미러링']),
  m(45, '이사 전후 체크리스트 총정리', '쭉빵카페', '리빙', '📋', 531, ['미러링']),
  m(46, '자취방 곰팡이 제거 꿀팁', '살림의 여왕', '리빙', '🧽', 495, []),
  m(47, '다이소 수납 꿀템 모음', '살림의 여왕', '리빙', '🗃️', 463, []),
  m(48, '화장실 청소 10분 루틴', '여성시대', '리빙', '🚿', 407, ['미러링']),
  m(49, '여권 재발급 미리 해야 하는 이유', '여행에 미치다', '여행', '🛂', 598, []),
  m(50, '혼자 떠난 후쿠오카 2박3일 경비 정리', '여성시대', '여행', '🇯🇵', 553, ['미러링']),
  m(51, '유럽 소매치기 수법 유형 정리', '쭉빵카페', '여행', '🎒', 528, ['미러링']),
  m(52, '국내 당일치기 기차여행 코스 5선', '여행에 미치다', '여행', '🚆', 484, []),
  m(53, '공항 대기시간 순삭하는 법', '도탁스', '여행', '🛫', 441, ['여혐주의']),
];
const TAGS = ['전체', '펀', '연예', '리빙', '여행', '취미', '스포츠', '푸드', '머니'];

// 이번달 유행 키워드 — 월간 카페 트렌드(2025.12) 상위 언급 키워드와 매칭해 AI 스코어 부스트
const MONTHLY_HOT = ['새해', '연말', '케이크', '눈', '겨울', '다이소', '결혼', '집', '인테리어', '여권'];
const isHot = (t: string) => MONTHLY_HOT.some((k) => t.includes(k));

// 게시글 유형 태그 — 제목 패턴 기반 자동 지정 (운영자 수기 분류 대체)
type ArtType = '움짤' | '짤' | '모음' | '후기' | '정보' | '썰';
const typeOf = (t: string): ArtType => {
  if (/\.gif|움짤/.test(t)) return '움짤';
  if (/모음|\.zip|정리표|5선|10선|모음집/.test(t)) return '모음';
  if (/\.jpg|\.insta|\.jpeg|사진|짤/.test(t)) return '짤';
  if (/후기|구경|풍경|근황|현실/.test(t)) return '후기';
  if (/팁|방법|체크리스트|루틴|배치도|이유|정리|독서법|모든 것|코스|하는 법/.test(t)) return '정보';
  return '썰';
};
const TYPES: ArtType[] = ['짤', '움짤', '모음', '후기', '정보', '썰'];

// ── 제목 기반 AI 주제 분석 (데모: 실서비스에선 임베딩+LLM 호출 자리) ──
// 활성 주제별 시그널 키워드 — 제목만으로 주제 매칭
const STORY_KW: Record<number, string[]> = {
  1: ['머리', '묶음', '포니테일', '헤어', '반머리', '묶었'],
  2: ['집', '평면도', '인테리어', '원룸', '조명', '수납', '이사', '곰팡이', '청소', '배치도'],
  3: ['여행', '여권', '워킹홀리데이', '후쿠오카', '소매치기', '기차', '공항', '7개국'],
  4: ['리즈', '비주얼', '과거 폼', '배우', '스타들'],
  5: ['결혼', '축의금', '웨딩', '커플'],
};
// 미배정 소재 클러스터 → 새 주제 제안 (실제 운영 엑셀의 과거 주제 문구 재사용)
const NEW_STORY_RULES: { kw: string[]; title: string; cat: string }[] = [
  { kw: ['부모님', '엄마 많이'], title: '유전자는 거짓말을 하지 않는 법👨‍👩‍👧', cat: '연예' },
  { kw: ['새해', '1월1일'], title: '항상 새해가 설레는 이유🎆', cat: '펀' },
];
type AiResult = { sug: Record<number, { sid: number; conf: number }>; news: { title: string; cat: string; ids: number[] }[] };

// 2025년 12월 달력 (12/1 = 월요일)
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAYS_IN_DEC = 31;

export function Curation() {
  const [mode, setMode] = useState<'board' | 'calendar'>('board');
  const [days, setDays] = useState<Record<number, Story[]>>(INITIAL_DAYS);
  const [selDay, setSelDay] = useState(1);
  const [published, setPublished] = useState<Set<number>>(new Set([2, 3, 8, 9, 10, 11]));
  const [mats, setMats] = useState<Mat[]>(INITIAL_MATS);
  const [tag, setTag] = useState('전체');
  const [typeFilter, setTypeFilter] = useState<'전체' | ArtType>('전체');
  const [hotOnly, setHotOnly] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [targetStory, setTargetStory] = useState<string>('3');
  const [selStory, setSelStory] = useState<number | null>(1);
  const [nextId, setNextId] = useState(200);
  const [aiRes, setAiRes] = useState<AiResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [boardTab, setBoardTab] = useState<'pool' | 'collect'>('pool');
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const isNarrow = useMediaQuery('(max-width: 1200px)');
  const panel = useResizable({ defaultSize: 340, minSizePx: 300, maxSizePx: 480 });

  const stories = days[selDay] ?? [];
  const isPublished = published.has(selDay);
  const countOf = (s: Story) => (s.fixed ? s.target : mats.filter((x) => x.storyId === s.id).length);
  const pool = useMemo(() => mats.filter((x) => !x.storyId
    && (tag === '전체' || x.tag === tag)
    && (typeFilter === '전체' || typeOf(x.title) === typeFilter)
    && (!hotOnly || isHot(x.title))), [mats, tag, typeFilter, hotOnly]);
  const tagCount = (t: string) => mats.filter((x) => !x.storyId && (t === '전체' || x.tag === t)).length;
  const typeCount = (t: '전체' | ArtType) => mats.filter((x) => !x.storyId && (t === '전체' || typeOf(x.title) === t)).length;
  const story = stories.find((s) => s.id === selStory) ?? null;
  const storyMats = mats.filter((x) => x.storyId === selStory);

  const toggleCheck = (id: number) => setChecked((c) => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const assign = (ids: number[], sid: number, ai = false) =>
    setMats((ms) => ms.map((x) => (ids.includes(x.id) ? { ...x, storyId: sid, ai: ai || x.ai } : x)));
  const unassign = (id: number) => setMats((ms) => ms.map((x) => (x.id === id ? { ...x, storyId: undefined, ai: false } : x)));
  const bulkAdd = () => { assign([...checked], Number(targetStory)); setChecked(new Set()); };

  // AI 자동 채움 — 카테고리 매칭 + 스코어(예상클릭 × 이번달 유행 1.5배) 상위로 부족분 자동 배정 (수기 서칭 대체)
  const score = (x: Mat) => x.clicks * (isHot(x.title) ? 1.5 : 1);
  const aiFill = (s: Story) => {
    if (s.fixed) return;
    const need = s.target - countOf(s);
    if (need <= 0) return;
    const picks = mats.filter((x) => !x.storyId && x.tag === s.cat && !x.flags.includes('단어'))
      .sort((a, b) => score(b) - score(a)).slice(0, need).map((x) => x.id);
    assign(picks, s.id, true);
  };
  // AI 주제 분석 — 제목만으로 ① 기존 주제 매칭(신뢰도) ② 새 주제 클러스터 제안
  const runAi = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const sug: AiResult['sug'] = {};
      const claimed = new Set<number>();
      for (const x of mats.filter((m) => !m.storyId)) {
        let best: { sid: number; hits: number } | null = null;
        for (const s of stories.filter((st) => !st.fixed)) {
          const hits = (STORY_KW[s.id] ?? []).filter((k) => x.title.includes(k)).length;
          if (hits > 0 && (!best || hits > best.hits)) best = { sid: s.id, hits };
        }
        if (best) { sug[x.id] = { sid: best.sid, conf: Math.min(97, 68 + best.hits * 12) }; claimed.add(x.id); }
      }
      const news = NEW_STORY_RULES.map((r) => ({
        title: r.title, cat: r.cat,
        ids: mats.filter((x) => !x.storyId && !claimed.has(x.id) && r.kw.some((k) => x.title.includes(k))).map((x) => x.id),
      })).filter((n) => n.ids.length >= 3);
      setAiRes({ sug, news });
      setAnalyzing(false);
    }, 900);
  };
  // 매칭 전체 적용 — 스토리별 목표 잔여분까지 신뢰도 순으로 배정
  const applyAllAi = () => {
    if (!aiRes) return;
    const byStory: Record<number, { id: number; conf: number }[]> = {};
    Object.entries(aiRes.sug).forEach(([id, s]) => {
      const mat = mats.find((x) => x.id === Number(id));
      if (!mat || mat.storyId) return;
      (byStory[s.sid] ??= []).push({ id: Number(id), conf: s.conf });
    });
    Object.entries(byStory).forEach(([sid, arr]) => {
      const s = stories.find((st) => st.id === Number(sid));
      if (!s) return;
      const room = Math.max(0, s.target - countOf(s));
      assign(arr.sort((a, b) => b.conf - a.conf).slice(0, room).map((x) => x.id), Number(sid), true);
    });
    setAiRes((r) => (r ? { ...r, sug: {} } : r));
  };
  // 새 주제 제안 수락 — 스토리 생성 + 소재 일괄 배정
  const acceptProposal = (p: AiResult['news'][number]) => {
    const sid = nextId; setNextId(sid + 1);
    setDays((d) => ({ ...d, [selDay]: [...(d[selDay] ?? []), { id: sid, title: p.title, cat: p.cat, target: Math.max(8, p.ids.length) }] }));
    assign(p.ids, sid, true);
    setAiRes((r) => (r ? { ...r, news: r.news.filter((x) => x.title !== p.title) } : r));
    setSelStory(sid);
  };
  const totalFilled = stories.reduce((a, s) => a + countOf(s), 0);
  const totalTarget = stories.reduce((a, s) => a + s.target, 0);
  const flaggedAssigned = mats.filter((x) => x.storyId && stories.some((s) => s.id === x.storyId) && x.flags.length > 0).length;

  // 빈 날짜 "만들기" — 기본 스토리 3개 생성 후 보드 진입
  const createDay = (day: number) => {
    const base = nextId;
    setDays((d) => ({ ...d, [day]: [
      { id: base, title: `12/${day} 스토리 1 (주제 문구 입력)`, cat: '펀', target: 10 },
      { id: base + 1, title: `12/${day} 스토리 2 (주제 문구 입력)`, cat: '연예', target: 10 },
      { id: base + 2, title: `12/${day} 스토리 3 (주제 문구 입력)`, cat: '리빙', target: 8 },
    ]}));
    setNextId(base + 3);
    setSelDay(day); setSelStory(base); setMode('board');
  };
  const openDay = (day: number) => { setSelDay(day); setSelStory(days[day]?.[0]?.id ?? null); setMode('board'); };

  // ── 운영 흐름 스테퍼: 수집 → AI 초안 → 검수 → 발행 ──
  const stepState = (i: number): 'done' | 'now' | 'todo' => {
    const draftDone = stories.length > 0 && stories.every((s) => countOf(s) >= s.target);
    if (i === 0) return 'done';
    if (i === 1) return draftDone ? 'done' : 'now';
    if (i === 2) return isPublished ? 'done' : draftDone ? 'now' : 'todo';
    return isPublished ? 'done' : 'todo';
  };
  const STEPS = [
    { label: '소재 수집', desc: `풀 ${mats.filter((x) => !x.storyId).length}건` },
    { label: 'AI 초안', desc: `${totalFilled}/${totalTarget}건` },
    { label: '검수', desc: `플래그 ${flaggedAssigned}건 확인` },
    { label: '발행', desc: isPublished ? '등록 완료' : '대기' },
  ];
  const stepper = (
    <HStack gap={2} vAlign="center" wrap="wrap">
      {STEPS.map((s, i) => {
        const st = stepState(i);
        return (
          <HStack key={s.label} gap={2} vAlign="center">
            {i > 0 && <Icon icon="chevronRight" size="sm" color="secondary" />}
            <StatusDot variant={st === 'done' ? 'success' : st === 'now' ? 'accent' : 'neutral'} isPulsing={st === 'now'} label={s.label} />
            <Text type="supporting" weight={st === 'now' ? 'bold' : 'medium'} color={st === 'todo' ? 'secondary' : undefined}>{i + 1}. {s.label}</Text>
            <Text type="supporting" color="secondary">{s.desc}</Text>
          </HStack>
        );
      })}
    </HStack>
  );

  const matCard = (a: Mat, inPool: boolean) => (
    <Card key={a.id} padding={3}>
      <HStack gap={3} vAlign="center">
        {inPool && <CheckboxInput label="선택" isLabelHidden value={checked.has(a.id)} onChange={() => toggleCheck(a.id)} />}
        <Thumbnail src={emojiThumb(a.emoji, a.c1, a.c2)} alt={a.title} label={a.title} style={{ width: 44, height: 44 }} />
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Text weight="medium" maxLines={1}>{a.title}</Text>
            <HStack gap={1} vAlign="center" wrap="wrap">
              <Text type="supporting" color="secondary">{a.cafe} · {a.tag} · 예상클릭 {fmt(a.clicks)}</Text>
              <Badge variant="cyan" label={typeOf(a.title)} />
              {isHot(a.title) && <Badge variant="green" label="🔥 이번달 유행" />}
              {a.ai && <Badge variant="purple" label="AI" />}
              {a.flags.map((f) => <Badge key={f} variant={f === '단어' ? 'red' : f === 'OLD' ? 'neutral' : 'yellow'} label={f} />)}
            </HStack>
            {inPool && !a.storyId && aiRes?.sug[a.id] && (
              <HStack gap={1} vAlign="center" wrap="wrap">
                <Badge variant="purple" label={`AI 추천 ${aiRes.sug[a.id].conf}%`} />
                <Text type="supporting" color="secondary" maxLines={1}>→ {stories.find((s) => s.id === aiRes.sug[a.id].sid)?.title}</Text>
                <Button label="적용" variant="ghost" size="sm" onClick={() => assign([a.id], aiRes.sug[a.id].sid, true)} />
              </HStack>
            )}
          </VStack>
        </StackItem>
        {!inPool && !isPublished && <IconButton label="스토리에서 제거" variant="ghost" size="sm" icon={<Icon icon="close" size="sm" />} onClick={() => unassign(a.id)} />}
      </HStack>
    </Card>
  );

  const detailBody = story && (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" justify="between">
        <Heading level={4}>스토리 구성</Heading>
        <IconButton label="닫기" variant="ghost" size="sm" icon={<Icon icon="close" size="sm" />} onClick={() => setSelStory(null)} />
      </HStack>
      <VStack gap={1}>
        <Text weight="semibold">{story.title}</Text>
        <HStack gap={2} vAlign="center"><Badge variant="blue" label={story.cat} /><Text type="supporting" color="secondary">{countOf(story)} / {story.target}건{story.clicks ? ` · 일일클릭 ${fmt(story.clicks)}` : ''}</Text></HStack>
        <ProgressBar label="채움 진행" isLabelHidden value={countOf(story)} max={story.target} variant={countOf(story) >= story.target ? 'success' : 'accent'} />
      </VStack>
      {story.fixed
        ? <HStack gap={2} vAlign="center"><StatusDot variant="success" label="발행 완료" /><Text type="supporting" color="secondary">발행 완료 — 구성 변경은 재발행 필요</Text></HStack>
        : <Button label={`AI 자동 채움 (${Math.max(story.target - countOf(story), 0)}건 부족)`} variant="primary" isDisabled={countOf(story) >= story.target}
            icon={<Icon icon={SparklesIcon} size="sm" />} onClick={() => aiFill(story)} />}
      <Divider />
      <VStack gap={2}>{storyMats.map((a) => matCard(a, false))}
        {!story.fixed && storyMats.length === 0 && <Text type="supporting" color="secondary">아직 배정된 글이 없습니다. 소재 풀에서 선택하거나 AI 자동 채움을 실행하세요.</Text>}
        {story.fixed && <Text type="supporting" color="secondary">발행된 스토리입니다 · 게시글 {story.target}건 노출 중</Text>}
      </VStack>
    </VStack>
  );

  // ── 달력 뷰 (실제 어드민 popular/category/manage 대응) ──
  if (mode === 'calendar') {
    return (
      <VStack gap={5}>
        <PageHeader
          title="카테고리 인기글"
          meta={<Badge variant="neutral" label="2025년 12월" />}
          description="일자별 스토리 배치 현황 · 날짜 클릭 시 큐레이션 보드로 이동 · 빈 날짜는 만들기로 생성"
          actions={<Button label="큐레이션 보드" variant="primary" size="md" onClick={() => setMode('board')} />}
        />
        <Grid columns={7} gap={2}>
          {WEEKDAYS.map((w) => <Text key={w} type="label" color="secondary">{w}</Text>)}
          {Array.from({ length: DAYS_IN_DEC }, (_, i) => {
            const day = i + 1;
            const ds = days[day];
            const pub = published.has(day);
            return (
              <Card key={day} padding={2} minHeight={112} variant={day === selDay ? 'blue' : 'default'}>
                <VStack gap={1} height="100%">
                  <HStack gap={1} vAlign="center" justify="between">
                    <Text type="supporting" weight="bold">{day}</Text>
                    {ds && (pub ? <Badge variant="green" label="발행" /> : <Badge variant="yellow" label="작업중" />)}
                  </HStack>
                  {ds ? (
                    <VStack gap={0.5}>
                      {ds.slice(0, 3).map((s) => <Text key={s.id} type="supporting" size="xsm" color="secondary" maxLines={1}>({countOf(s)}) {s.title}</Text>)}
                      {ds.length > 3 && <Text type="supporting" size="xsm" color="secondary">외 {ds.length - 3}개</Text>}
                      <Button label="열기" variant="ghost" size="sm" onClick={() => openDay(day)} />
                    </VStack>
                  ) : (
                    <StackItem size="fill">
                      <VStack height="100%" vAlign="end">
                        <Button label="만들기" variant="ghost" size="sm" icon={<Icon icon={PlusIcon} size="sm" />} onClick={() => createDay(day)} />
                      </VStack>
                    </StackItem>
                  )}
                </VStack>
              </Card>
            );
          })}
        </Grid>
      </VStack>
    );
  }

  // ── 큐레이션 보드 ──
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={5}>
          <VStack gap={4}>
            <PageHeader
              title="카테고리 인기글"
              meta={<>
                <Badge variant="neutral" label={`2025.12.${String(selDay).padStart(2, '0')}`} />
                {isPublished
                  ? <Badge variant="green" label="발행 완료" />
                  : <HStack gap={1} vAlign="center"><StatusDot variant={totalFilled >= totalTarget ? 'success' : 'warning'} label="채움 상태" /><Text type="supporting" color="secondary">{totalFilled} / {totalTarget}건 구성</Text></HStack>}
              </>}
              description="AI 스코어 = 예상클릭 × 이번달 유행 1.5배 · 유형 태그 자동 지정 · 검수 플래그 자동 감지 · 일일클릭 자동 취합"
              extra={
                <HStack gap={1} vAlign="center" wrap="wrap">
                  <Text type="supporting" color="secondary">이번달 유행:</Text>
                  {MONTHLY_HOT.slice(0, 7).map((k) => <Badge key={k} variant="green" label={`#${k}`} />)}
                </HStack>
              }
              actions={<>
                <Button label="달력" variant="secondary" size="md" icon={<Icon icon="calendar" size="sm" />} onClick={() => setMode('calendar')} />
                {!isPublished && <Button label="AI 주제 분석" variant="secondary" size="md" isLoading={analyzing} icon={<Icon icon={SparklesIcon} size="sm" />} onClick={runAi} />}
                {!isPublished && <Button label="발행" variant="primary" size="md" icon={<Icon icon={RocketLaunchIcon} size="sm" />}
                  isDisabled={totalFilled < totalTarget} onClick={() => setPublished((p) => new Set(p).add(selDay))} />}
              </>}
            />
            <Card padding={3}>{stepper}</Card>
            {aiRes && (
              <Card padding={4} variant="purple">
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Badge variant="purple" label="AI" />
                    <Text weight="semibold">제목 기반 분석 완료</Text>
                    <Text type="supporting" color="secondary">주제 매칭 {Object.keys(aiRes.sug).length}건 · 새 주제 제안 {aiRes.news.length}건</Text>
                    <StackItem size="fill"><HStack justify="end" gap={2}>
                      <Button label="매칭 전체 적용" size="sm" variant="primary" isDisabled={!Object.keys(aiRes.sug).length} onClick={applyAllAi} />
                      <IconButton label="닫기" size="sm" variant="ghost" icon={<Icon icon="close" size="sm" />} onClick={() => setAiRes(null)} />
                    </HStack></StackItem>
                  </HStack>
                  {aiRes.news.map((p) => (
                    <HStack key={p.title} gap={2} vAlign="center" wrap="wrap">
                      <Badge variant="blue" label="✨ 새 주제 제안" />
                      <Text weight="medium">{p.title}</Text>
                      <Badge variant="neutral" label={p.cat} />
                      <Text type="supporting" color="secondary">소재 {p.ids.length}건 매칭</Text>
                      <Button label="스토리로 추가 + 배정" size="sm" variant="secondary" onClick={() => acceptProposal(p)} />
                    </HStack>
                  ))}
                </VStack>
              </Card>
            )}
            <Grid columns={{ minWidth: 230 }} gap={3}>
              {stories.map((s) => {
                const c = countOf(s);
                return (
                  <Card key={s.id} padding={4}>
                    <VStack gap={2}>
                      <HStack gap={1} vAlign="center"><Badge variant="blue" label={s.cat} />{s.fixed || isPublished ? <Badge variant="green" label="발행" /> : c >= s.target ? <Badge variant="green" label="완료" /> : <Badge variant="yellow" label={`${s.target - c} 부족`} />}</HStack>
                      <Text weight="medium" maxLines={1}>{s.title}</Text>
                      <ProgressBar label={s.title} isLabelHidden value={c} max={s.target} variant={c >= s.target ? 'success' : 'accent'} />
                      <HStack gap={2} vAlign="center" justify="between">
                        <Text type="supporting" color="secondary">{c}/{s.target}건{s.clicks ? ` · 클릭 ${fmt(s.clicks)}` : ''}</Text>
                        <Button label="구성 보기" variant="ghost" size="sm" onClick={() => setSelStory(s.id)} />
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
            <HStack gap={2} vAlign="center" wrap="wrap">
              <SegmentedControl value={boardTab} onChange={(v) => setBoardTab(v as never)} label="보드 보기" size="md">
                <SegmentedControlItem value="pool" label={`소재 풀 ${mats.filter((x) => !x.storyId).length}`} />
                <SegmentedControlItem value="collect" label={`인기글 모아보기 ${mats.filter((x) => x.storyId && stories.some((s) => s.id === x.storyId)).length}`} />
              </SegmentedControl>
              {boardTab === 'collect' && (
                <StackItem size="fill"><HStack justify="end" gap={2}>
                  <Button label="전체 열기" size="sm" variant="ghost" onClick={() => setCollapsedIds(new Set())} />
                  <Button label="전체 닫기" size="sm" variant="ghost" onClick={() => setCollapsedIds(new Set(stories.map((s) => s.id)))} />
                </HStack></StackItem>
              )}
            </HStack>
            {boardTab === 'pool' && (<>
            <VStack gap={2}>
              <HStack gap={2} vAlign="center"><Heading level={4}>소재 풀</Heading><Text type="supporting" color="secondary">CMS 태그 인기글 수집분 · 유형 태그 자동 지정 · 검수 플래그 자동 감지</Text></HStack>
              <HStack gap={2} wrap="wrap">
                {TAGS.map((t) => <ToggleButton key={t} size="sm" label={`${t} ${tagCount(t)}`} isPressed={tag === t} onPressedChange={() => setTag(t)} />)}
              </HStack>
              <HStack gap={2} wrap="wrap" vAlign="center">
                <Text type="supporting" color="secondary">유형</Text>
                {(['전체', ...TYPES] as const).map((t) => <ToggleButton key={t} size="sm" label={`${t} ${typeCount(t)}`} isPressed={typeFilter === t} onPressedChange={() => setTypeFilter(t)} />)}
                <ToggleButton size="sm" label="🔥 이번달 유행만" isPressed={hotOnly} onPressedChange={setHotOnly} />
              </HStack>
            </VStack>
            {!isPublished && (
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="supporting" weight="semibold">선택 {checked.size}건을</Text>
                <Selector label="대상 스토리" isLabelHidden size="sm" options={stories.filter((s) => !s.fixed).map((s) => ({ value: String(s.id), label: `${s.title} (${countOf(s)}/${s.target})` }))}
                  value={targetStory} onChange={(v) => v && setTargetStory(v)} />
                <Button label="스토리에 추가" variant="primary" size="sm" isDisabled={checked.size === 0} icon={<Icon icon={ArrowUpTrayIcon} size="sm" />} onClick={bulkAdd} />
              </HStack>
            )}
            <Grid columns={{ minWidth: 340 }} gap={3}>{pool.map((a) => matCard(a, true))}</Grid>
            {pool.length === 0 && <Card padding={6}><Text type="supporting" color="secondary">해당 조건의 미배정 소재가 없습니다.</Text></Card>}
            </>)}
            {boardTab === 'collect' && (
              <VStack gap={4}>
                {stories.map((s) => {
                  const arts = mats.filter((x) => x.storyId === s.id);
                  const open = !collapsedIds.has(s.id);
                  return (
                    <Collapsible key={s.id} isOpen={open}
                      onOpenChange={(o) => setCollapsedIds((c) => { const n = new Set(c); o ? n.delete(s.id) : n.add(s.id); return n; })}
                      trigger={
                        <HStack gap={2} vAlign="center" wrap="wrap">
                          <Badge variant="blue" label={s.cat} />
                          <Text weight="bold">{s.title}</Text>
                          <Badge variant="neutral" label={`${countOf(s)}/${s.target}`} />
                          {(s.fixed || isPublished) && <Badge variant="green" label="발행" />}
                        </HStack>
                      }>
                      {s.fixed
                        ? <Card padding={4}><Text type="supporting" color="secondary">발행 완료 — 게시글 {s.target}건 노출 중</Text></Card>
                        : arts.length
                          ? <Grid columns={{ minWidth: 300 }} gap={3}>{arts.map((a) => matCard(a, false))}</Grid>
                          : <Card padding={4}><Text type="supporting" color="secondary">배정된 글이 없습니다 — 소재 풀 선택 또는 AI 주제 분석으로 채우세요.</Text></Card>}
                    </Collapsible>
                  );
                })}
              </VStack>
            )}
            {isNarrow && story && (<><Divider />{detailBody}</>)}
          </VStack>
        </LayoutContent>
      }
      end={!isNarrow && story && (
        <>
          <ResizeHandle resizable={panel.props} isReversed isAlwaysVisible={false} />
          <LayoutPanel hasDivider label="스토리 구성" resizable={panel.props as never}>
            {detailBody}
          </LayoutPanel>
        </>
      )}
    />
  );
}
