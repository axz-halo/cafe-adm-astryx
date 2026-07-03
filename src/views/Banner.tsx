import { useMemo, useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Switch } from '@astryxdesign/core/Switch';
import { TextInput } from '@astryxdesign/core/TextInput';
import { List, ListItem } from '@astryxdesign/core/List';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Icon } from '@astryxdesign/core/Icon';
import { RocketLaunchIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { PageHeader } from './PageHeader';

// ── 앱홈 배너 관리 (아티팩트 bnr 모듈 이식 — 1136×432 · CBT/실서버 배포 · 배포 내역 · 담당자 LDAP) ──
const TODAY = '2026.07.02';
type Variant = 'yellow' | 'purple' | 'green' | 'pink' | 'blue' | 'orange' | 'gray';
type Bnr = { id: number; title: string; sub: string; link: string; variant: Variant; os: '공통' | 'iOS' | 'AOS'; start: string; end: string; reg: string; owner: string; on: boolean };
const INITIAL: Bnr[] = [
  { id: 1, title: '카페 홈개편 업데이트', sub: '더 자연스러워진 카페 홈을 만나보세요', link: 'daumcafe://home-renewal', variant: 'yellow', os: '공통', start: '2026.06.01', end: '2026.06.30', reg: '2026.05.28', owner: 'halo.axz', on: true },
  { id: 2, title: '여름맞이 인기글 이벤트', sub: '참여하고 포인트 받기', link: 'https://cafe.daum.net/event/summer', variant: 'yellow', os: '공통', start: '2026.06.10', end: '2026.07.10', reg: '2026.06.05', owner: 'jisu.axz', on: true },
  { id: 3, title: 'AI 비디오 베타 오픈', sub: '카페에서 영상을 만들어보세요', link: 'daumcafe://aivideo', variant: 'purple', os: 'iOS', start: '2026.06.20', end: '2026.07.20', reg: '2026.06.18', owner: 'minho.axz', on: true },
  { id: 4, title: '카페지기 AI 운영 도구', sub: '등업·공지 자동화 미리보기', link: 'daumcafe://agent', variant: 'green', os: 'AOS', start: '2026.07.01', end: '2026.07.31', reg: '2026.06.20', owner: 'halo.axz', on: false },
  { id: 5, title: '인증형 커뮤니티 신설', sub: '자격증·사업자 인증 카페', link: 'daumcafe://cert', variant: 'pink', os: '공통', start: '2026.05.15', end: '2026.06.05', reg: '2026.05.10', owner: 'yerin.axz', on: false },
  { id: 6, title: '신규 가입 환영 기획전', sub: '첫 카페 가입하고 혜택받기', link: 'daumcafe://welcome', variant: 'blue', os: '공통', start: '2026.04.01', end: '2026.04.30', reg: '2026.03.28', owner: 'jisu.axz', on: false },
  { id: 7, title: '출석체크 리워드 오픈', sub: '매일 출석하고 포인트 적립', link: 'daumcafe://attendance', variant: 'orange', os: '공통', start: '2026.03.10', end: '2026.04.10', reg: '2026.03.05', owner: 'minho.axz', on: false },
  { id: 8, title: '봄맞이 취미 카페 추천', sub: '새 취미를 시작해보세요', link: 'daumcafe://hobby', variant: 'green', os: '공통', start: '2026.03.01', end: '2026.03.31', reg: '2026.02.25', owner: 'yerin.axz', on: false },
  { id: 9, title: '게임 카페 토너먼트', sub: '길드원 모집 & 대회 안내', link: 'daumcafe://game-cup', variant: 'purple', os: 'AOS', start: '2026.02.15', end: '2026.03.15', reg: '2026.02.10', owner: 'jisu.axz', on: false },
  { id: 10, title: '설 연휴 카페 이벤트', sub: '덕담 남기고 선물받기', link: 'daumcafe://seollal', variant: 'pink', os: '공통', start: '2026.02.01', end: '2026.02.18', reg: '2026.01.27', owner: 'halo.axz', on: false },
  { id: 11, title: '카페 알림 설정 안내', sub: '중요한 글을 놓치지 마세요', link: 'daumcafe://noti-guide', variant: 'yellow', os: 'iOS', start: '2026.01.10', end: '2026.02.10', reg: '2026.01.06', owner: 'minho.axz', on: false },
];
type Hist = { ts: string; env: 'prod' | 'cbt'; count: number; by: string };
const INITIAL_HIST: Hist[] = [
  { ts: '2026.06.24 10:32', env: 'prod', count: 11, by: 'halo.axz' },
  { ts: '2026.06.24 10:18', env: 'cbt', count: 11, by: 'halo.axz' },
  { ts: '2026.06.23 18:05', env: 'cbt', count: 10, by: 'jisu.axz' },
];
type St = 'live' | 'wait' | 'end' | 'off';
const statusOf = (b: Bnr): St => (b.end < TODAY ? 'end' : b.start > TODAY ? 'wait' : b.on ? 'live' : 'off');
const ST_LABEL: Record<St, string> = { live: '노출중', wait: '예약', end: '종료', off: '미노출' };
const ST_BADGE: Record<St, 'success' | 'blue' | 'neutral'> = { live: 'success', wait: 'blue', end: 'neutral', off: 'neutral' };

const nowTs = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function Banner() {
  const [banners, setBanners] = useState<Bnr[]>(INITIAL);
  const [hist, setHist] = useState<Hist[]>(INITIAL_HIST);
  const [q, setQ] = useState('');
  const [os, setOs] = useState('전체');
  const [st, setSt] = useState('전체');
  const [dlg, setDlg] = useState(false);

  const filtered = useMemo(() => banners.filter((b) =>
    (os === '전체' || b.os === os) &&
    (st === '전체' || ST_LABEL[statusOf(b)] === st) &&
    (!q.trim() || b.title.toLowerCase().includes(q.trim().toLowerCase()) || b.link.toLowerCase().includes(q.trim().toLowerCase()))
  ), [banners, q, os, st]);

  const count = (s: St) => banners.filter((b) => statusOf(b) === s).length;
  const toggle = (id: number, v: boolean) => setBanners((bs) => bs.map((b) => (b.id === id ? { ...b, on: v } : b)));
  const deploy = (env: 'cbt' | 'prod') => setHist((h) => [{ ts: nowTs(), env, count: banners.length, by: 'halo.axz' }, ...h]);

  return (
    <VStack gap={5}>
      <PageHeader
        title="카페배너"
        meta={<Badge variant="neutral" label="규격 1136×432" />}
        description="앱홈 상단 배너 · 변경 사항은 CBT 검증 후 실서버 배포 권장 · 실서버 배포는 SUPERADMIN 전용"
        actions={<>
          <Button label="CBT 배포" variant="secondary" size="md" icon={<Icon icon={BeakerIcon} size="sm" />} onClick={() => deploy('cbt')} />
          <Button label="실서버 배포" variant="primary" size="md" icon={<Icon icon={RocketLaunchIcon} size="sm" />} onClick={() => setDlg(true)} />
        </>}
      />

      <Grid columns={{ minWidth: 160 }} gap={3}>
        {(['live', 'wait', 'end'] as St[]).map((s) => (
          <Card key={s} padding={5}><VStack gap={1}><Text type="supporting">{ST_LABEL[s]}</Text><Heading level={3}>{count(s)}</Heading></VStack></Card>
        ))}
        <Card padding={5}><VStack gap={1}><Text type="supporting">전체</Text><Heading level={3}>{banners.length}</Heading></VStack></Card>
      </Grid>

      <HStack gap={2} vAlign="center" wrap="wrap">
        <StackItem size="fill"><TextInput label="배너 검색" isLabelHidden size="md" value={q} onChange={setQ} /></StackItem>
        <SegmentedControl value={os} onChange={setOs} label="OS" size="md">
          {['전체', '공통', 'iOS', 'AOS'].map((v) => <SegmentedControlItem key={v} value={v} label={v} />)}
        </SegmentedControl>
        <SegmentedControl value={st} onChange={setSt} label="상태" size="md">
          {['전체', '노출중', '예약', '미노출', '종료'].map((v) => <SegmentedControlItem key={v} value={v} label={v} />)}
        </SegmentedControl>
      </HStack>

      <Grid columns={{ minWidth: 300 }} gap={3}>
        {filtered.map((b) => {
          const s = statusOf(b);
          return (
            <Card key={b.id} padding={4}>
              <VStack gap={3} height="100%">
                <Card variant={b.variant} padding={0} height={124}>
                  <Center height="100%" width="100%">
                    <VStack gap={1} hAlign="center"><Text weight="bold">{b.title}</Text><Text type="supporting" color="secondary">{b.sub}</Text></VStack>
                  </Center>
                </Card>
                <HStack gap={1} vAlign="center" wrap="wrap">
                  <Badge variant={ST_BADGE[s]} label={ST_LABEL[s]} />
                  <Badge variant="neutral" label={b.os} />
                  <StackItem size="fill"><HStack justify="end"><Switch label="노출" value={b.on} isDisabled={s === 'end'} onChange={(v) => toggle(b.id, v)} /></HStack></StackItem>
                </HStack>
                <StackItem size="fill">
                  <VStack gap={0.5}>
                    <Text type="supporting" color="secondary">기간 {b.start} ~ {b.end}</Text>
                    <HStack gap={2}><Text type="supporting" color="secondary">담당자</Text><Text type="supporting" color="accent">{b.owner}</Text><Text type="supporting" color="secondary">· 등록 {b.reg}</Text></HStack>
                    <Text type="supporting" color="secondary" maxLines={1}>{b.link}</Text>
                  </VStack>
                </StackItem>
              </VStack>
            </Card>
          );
        })}
      </Grid>

      <Card padding={5}>
        <List hasDividers density="balanced" header={<HStack gap={2} vAlign="center"><Heading level={4}>배포 내역</Heading><Text type="supporting" color="secondary">최근 순</Text></HStack>}>
          {hist.map((h, i) => (
            <ListItem key={i} label={h.ts} description={`${h.by} · 배너 ${h.count}건 반영`}
              startContent={<Badge variant={h.env === 'prod' ? 'red' : 'blue'} label={h.env === 'prod' ? '실서버' : 'CBT'} />} />
          ))}
        </List>
      </Card>

      <AlertDialog isOpen={dlg} onOpenChange={setDlg} title="실서버 배포"
        description={`현재 배너 구성 ${banners.length}건을 실서버에 반영합니다. SUPERADMIN 권한으로 진행됩니다. (데모 — 실제 쓰기 비활성)`}
        actionLabel="배포" actionVariant="primary" cancelLabel="취소"
        onAction={() => { deploy('prod'); setDlg(false); }} />
    </VStack>
  );
}
