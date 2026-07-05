import { useMemo, useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Divider } from '@astryxdesign/core/Divider';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { PageHeader } from './PageHeader';

// ── 통합 검색 · 360 — 기존 조회 페이지 12종(카페정보/가입카페/ID변환/펌링크 5종/쪽지/푸시토큰) 통합 ──
// 식별자 형식 자동 판별: 펌링크·URL → 게시글 / @포함 → 회원(email) / 숫자 → 카페(grpid) / 영숫자 → 카페(grpcode)
type Kind = 'cafe' | 'member' | 'post';
const detect = (q: string): Kind | null => {
  const s = q.trim();
  if (!s) return null;
  if (/\/|https?:|permlink/.test(s)) return 'post';
  if (/@/.test(s)) return 'member';
  if (/^\d{6,}$/.test(s) || /^[a-z0-9_]{3,}$/i.test(s)) return 'cafe';
  return 'member';
};
const KIND_LABEL: Record<Kind, string> = { cafe: '카페', member: '회원', post: '게시글' };

// 카페 360 (여성시대 — Members와 동일 실데이터 계열)
const CAFE = {
  name: '＊여성시대＊ 차분한 20대들의 알흠다운 공간', grpcode: 'subdued20club', grpid: '1019101842',
  grade: '플래티넘', opened: '2005.03', members: '167만', state: '정상',
  settle: { adfit: '₩48,210,000', share: '₩12,050,000', unsettled: '₩1,340,000', month: '2026-05' },
  backups: [
    { id: 'BK-0620', kind: '게시글 전체', period: '2005~2026', by: 'cs.kim', at: '06-20', state: '완료' },
    { id: 'BK-0410', kind: '회원 목록', period: '-', by: 'cs.lee', at: '04-10', state: '완료' },
  ],
};

// 회원 360 (가입카페/ID변환/블라인드/신고수/쪽지/푸시토큰 통합)
const MEMBER = {
  nick: '조용한독자', userid: 'reader_92', email: 'reader92@daum.net', joined: '2008.11', reports: 3,
  cafes: [
    { name: '＊여성시대＊', grpcode: 'subdued20club', role: '일반회원', at: '2011.05' },
    { name: '도탁스 (DOTAX)', grpcode: 'dotax', role: '스탭', at: '2013.02' },
    { name: '고양이라서 다행이야', grpcode: 'anticat', role: '일반회원', at: '2016.09' },
  ],
  devices: [
    { os: 'AOS', id: 'aos-8f21…c4', ver: '5.12.0', push: true },
    { os: 'iOS', id: 'ios-1b90…7a', ver: '5.11.3', push: false },
  ],
};

// 게시글 360 (펌링크 조회 5종 통합: 본문/댓글/첨부/음저권/이동횟수)
const POST = {
  title: '[정보] 여름 원피스 세일 정보 모음 (업데이트)', permlink: 'subdued20club/1Qab/1204158',
  cafe: '＊여성시대＊', author: 'reader_92', at: '07-01 21:14', deleted: false,
  body: '이번 주 백화점·온라인 세일 정보를 정리했습니다. (본문 스냅샷 — 삭제 시에도 보존)',
  comments: [
    { id: 'c1', by: 'buyer_a', body: '정보 감사합니다!', risk: false },
    { id: 'c2', by: 'spam_bot9', body: '★대박할인★ 지금 클릭 → bit.ly/…', risk: true },
    { id: 'c3', by: 'reader_x', body: '링크 신고했어요', risk: false },
  ],
  files: [
    { name: 'sale_2026.jpg', kind: '이미지', size: '820KB', flagged: false },
    { name: 'lookbook.mp4', kind: '동영상', size: '24MB', flagged: false },
    { name: 'coupon_list.hwp', kind: '파일', size: '1.2MB', flagged: true },
  ],
  copyright: '정상', moveCount: 2,
};

type CafeBk = (typeof CAFE.backups)[number];
type MemCafe = (typeof MEMBER.cafes)[number];

export function Console360() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('cafe');
  const [log, setLog] = useState<string[]>(['07-01 · reader_92 프로필 블라인드 (cs.clean) — 롤백 가능']);
  const [msgReason, setMsgReason] = useState('');
  const [msgOpen, setMsgOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [deletedCmt, setDeletedCmt] = useState<Record<string, boolean>>({});

  const detected = useMemo(() => detect(q), [q]);
  const search = () => { if (detected) setKind(detected); };
  const act = (msg: string) => setLog((l) => [`07-02 · ${msg} (halo.wave)`, ...l]);

  const selCount = POST.comments.filter((c) => checked[c.id] && !deletedCmt[c.id]).length;
  const delComments = () => {
    setDeletedCmt((d) => ({ ...d, ...Object.fromEntries(Object.keys(checked).filter((k) => checked[k]).map((k) => [k, true])) }));
    act(`댓글 ${selCount}건 삭제 — ${POST.permlink}`);
    setChecked({});
  };

  const bkCols: TableColumn<CafeBk>[] = [
    { key: 'id', header: 'ID', width: pixel(90), renderCell: (r) => <Text type="supporting">{r.id}</Text> },
    { key: 'kind', header: '종류', width: proportional(1), renderCell: (r) => <Text weight="medium">{r.kind}</Text> },
    { key: 'period', header: '기간', width: pixel(110), renderCell: (r) => <Text type="supporting" color="secondary">{r.period}</Text> },
    { key: 'by', header: '신청', width: pixel(110), renderCell: (r) => <Text type="supporting" color="secondary">{r.by} · {r.at}</Text> },
    { key: 'state', header: '상태', width: pixel(70), renderCell: (r) => <Badge variant="green" label={r.state} /> },
  ];
  const mcCols: TableColumn<MemCafe>[] = [
    { key: 'name', header: '카페', width: proportional(1), renderCell: (r) => <VStack gap={0}><Text weight="medium">{r.name}</Text><Text type="supporting" color="secondary">{r.grpcode}</Text></VStack> },
    { key: 'role', header: '등급', width: pixel(90), renderCell: (r) => <Badge variant="neutral" label={r.role} /> },
    { key: 'at', header: '가입', width: pixel(80), renderCell: (r) => <Text type="supporting" color="secondary">{r.at}</Text> },
  ];

  return (
    <VStack gap={5}>
      <PageHeader title="통합 검색 · 360"
        description="email · userid · grpcode · grpid · 펌링크를 자동 판별해 대상 360으로 — 기존 조회 12종(카페정보/가입카페/ID변환/펌링크 5종/쪽지/푸시토큰) 통합, 수동 변환 버튼 제거" />

      {/* 자동 판별 검색 */}
      <Card padding={4}>
        <VStack gap={2}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill"><TextInput label="통합 검색" isLabelHidden size="md" value={q} onChange={setQ} placeholder="펌링크 · grpcode · email · userid 입력 (형식 자동 판별)" /></StackItem>
            <Button label="검색" variant="primary" size="md" onClick={search} />
          </HStack>
          <HStack gap={2} vAlign="center">
            <Text type="supporting" color="secondary">판별 우선순위: 펌링크 › grpcode/grpid › email › userid</Text>
            {detected && <Badge variant="blue" label={`판별: ${KIND_LABEL[detected]} 360`} />}
          </HStack>
        </VStack>
      </Card>

      <SegmentedControl value={kind} onChange={(v) => setKind(v as Kind)} label="대상" size="md">
        <SegmentedControlItem value="cafe" label="카페 360" />
        <SegmentedControlItem value="member" label="회원 360" />
        <SegmentedControlItem value="post" label="게시글 360" />
      </SegmentedControl>

      {kind === 'cafe' && (
        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={4}>
              <Card padding={5}>
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center" wrap="wrap"><Heading level={4}>{CAFE.name}</Heading><Badge variant="green" label={CAFE.state} /><Badge variant="cyan" label={CAFE.grade} /></HStack>
                  <MetadataList columns={2}>
                    <MetadataListItem label="grpcode">{CAFE.grpcode}</MetadataListItem>
                    <MetadataListItem label="grpid">{CAFE.grpid}</MetadataListItem>
                    <MetadataListItem label="개설">{CAFE.opened}</MetadataListItem>
                    <MetadataListItem label="회원 수">{CAFE.members}</MetadataListItem>
                  </MetadataList>
                </VStack>
              </Card>
              <VStack gap={2}>
                <Heading level={4}>백업 신청 내역</Heading>
                <Card padding={0}>
                  <Table<CafeBk> data={CAFE.backups} columns={bkCols} idKey="id" density="balanced" dividers="rows" />
                </Card>
              </VStack>
            </VStack>
          </StackItem>
          <Card padding={4} width={320}>
            <VStack gap={3}>
              <Heading level={4}>정산 요약</Heading>
              <MetadataList columns="single">
                <MetadataListItem label="adfit 매출">{CAFE.settle.adfit}</MetadataListItem>
                <MetadataListItem label="지기 수익">{CAFE.settle.share}</MetadataListItem>
                <MetadataListItem label="미정산"><Badge variant="yellow" label={CAFE.settle.unsettled} /></MetadataListItem>
                <MetadataListItem label="기준월">{CAFE.settle.month}</MetadataListItem>
              </MetadataList>
              <Divider />
              <VStack gap={2}>
                <Button label="백업 신청" variant="secondary" size="sm" onClick={() => act(`${CAFE.grpcode} 백업 신청`)} />
                <Button label="점검 공지 등록" variant="secondary" size="sm" onClick={() => act(`${CAFE.grpcode} 점검 공지`)} />
              </VStack>
            </VStack>
          </Card>
        </HStack>
      )}

      {kind === 'member' && (
        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={4}>
              <Card padding={5}>
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center" wrap="wrap"><Heading level={4}>{MEMBER.nick}</Heading><Badge variant="green" label="활성" />{MEMBER.reports > 0 && <Badge variant="yellow" label={`신고 ${MEMBER.reports}회`} />}</HStack>
                  <MetadataList columns={2}>
                    <MetadataListItem label="userid">{MEMBER.userid}</MetadataListItem>
                    <MetadataListItem label="email">{MEMBER.email}</MetadataListItem>
                    <MetadataListItem label="가입">{MEMBER.joined}</MetadataListItem>
                    <MetadataListItem label="ID 변환">자동 (수동 버튼 제거)</MetadataListItem>
                  </MetadataList>
                </VStack>
              </Card>
              <Card padding={0}>
                <Table<MemCafe> data={MEMBER.cafes} columns={mcCols} idKey="grpcode" density="balanced" dividers="rows" hasHover />
              </Card>
              <Card padding={4}>
                <VStack gap={2}>
                  <Heading level={4}>디바이스 · 푸시 토큰</Heading>
                  {MEMBER.devices.map((d) => (
                    <HStack key={d.id} gap={2} vAlign="center">
                      <Badge variant={d.os === 'iOS' ? 'neutral' : 'green'} label={d.os} />
                      <StackItem size="fill"><Text type="supporting">{d.id} · v{d.ver}</Text></StackItem>
                      <Badge variant={d.push ? 'blue' : 'neutral'} label={d.push ? '푸시 ON' : '푸시 OFF'} />
                    </HStack>
                  ))}
                </VStack>
              </Card>
            </VStack>
          </StackItem>
          <Card padding={4} width={320}>
            <VStack gap={3}>
              <Heading level={4}>조치</Heading>
              <VStack gap={2}>
                <Button label="프로필 이미지 블라인드" variant="secondary" size="sm" onClick={() => act(`${MEMBER.userid} 프로필 블라인드 — 롤백 가능`)} />
                <Button label="클린 신고수 초기화" variant="secondary" size="sm" onClick={() => act(`${MEMBER.userid} 신고수 초기화`)} />
                <Button label="휴면 해제" variant="secondary" size="sm" onClick={() => act(`${MEMBER.userid} 휴면 해제`)} />
              </VStack>
              <Divider />
              <VStack gap={2}>
                <HStack gap={2} vAlign="center"><Heading level={4}>쪽지 조회</Heading><Badge variant="purple" label="통비 권한" /></HStack>
                {!msgOpen ? (
                  <>
                    <Text type="supporting" color="secondary">건별 열람 사유 기록 의무 (감사 로그)</Text>
                    <TextInput label="열람 사유" isLabelHidden size="sm" value={msgReason} onChange={setMsgReason} placeholder="예: CS #48120 분쟁 확인" />
                    <Button label="열람" variant="primary" size="sm" isDisabled={msgReason.trim().length < 4}
                      onClick={() => { setMsgOpen(true); act(`${MEMBER.userid} 쪽지 열람 — 사유: ${msgReason}`); }} />
                  </>
                ) : (
                  <>
                    <Badge variant="yellow" label={`열람 중 · ${msgReason}`} />
                    <Text type="supporting" color="secondary">개인 쪽지 3건 · 단체 1건</Text>
                    <Button label="열람 종료" variant="secondary" size="sm" onClick={() => { setMsgOpen(false); setMsgReason(''); }} />
                  </>
                )}
              </VStack>
            </VStack>
          </Card>
        </HStack>
      )}

      {kind === 'post' && (
        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={4}>
              <Card padding={5}>
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center" wrap="wrap"><Heading level={4}>{POST.title}</Heading><Badge variant={POST.deleted ? 'red' : 'green'} label={POST.deleted ? '삭제됨 · 스냅샷' : '노출 중'} /></HStack>
                  <Text type="supporting" color="secondary">{POST.cafe} · {POST.author} · {POST.at} · {POST.permlink}</Text>
                  <Divider />
                  <Text>{POST.body}</Text>
                </VStack>
              </Card>
              <Card padding={4}>
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center">
                    <Heading level={4}>댓글</Heading><Badge variant="neutral" label={String(POST.comments.filter((c) => !deletedCmt[c.id]).length)} />
                    <StackItem size="fill" />
                    {selCount > 0 && <Button label={`선택 ${selCount}건 삭제`} variant="primary" size="sm" onClick={delComments} />}
                  </HStack>
                  <VStack gap={2}>
                    {POST.comments.filter((c) => !deletedCmt[c.id]).map((c) => (
                      <HStack key={c.id} gap={3} vAlign="center">
                        <CheckboxInput label={c.by} isLabelHidden value={!!checked[c.id]} onChange={(v) => setChecked((s) => ({ ...s, [c.id]: v }))} />
                        <Text type="supporting" color="secondary" weight="medium">{c.by}</Text>
                        <StackItem size="fill"><Text maxLines={1}>{c.body}</Text></StackItem>
                        {c.risk && <Badge variant="red" label="스팸 의심" />}
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </Card>
            </VStack>
          </StackItem>
          <Card padding={4} width={320}>
            <VStack gap={3}>
              <Heading level={4}>첨부 · 권리</Heading>
              <VStack gap={2}>
                {POST.files.map((f) => (
                  <HStack key={f.name} gap={2} vAlign="center">
                    <Badge variant="neutral" label={f.kind} />
                    <StackItem size="fill"><Text type="supporting" maxLines={1}>{f.name} · {f.size}</Text></StackItem>
                    {f.flagged ? <Badge variant="red" label="악성 의심" /> : <Badge variant="green" label="정상" />}
                  </HStack>
                ))}
              </VStack>
              <Divider />
              <MetadataList columns="single">
                <MetadataListItem label="음저권"><Badge variant="green" label={POST.copyright} /></MetadataListItem>
                <MetadataListItem label="이동 횟수">{POST.moveCount}회</MetadataListItem>
              </MetadataList>
              <VStack gap={2}>
                <Button label="이동 횟수 초기화" variant="secondary" size="sm" onClick={() => act(`${POST.permlink} 이동횟수 초기화`)} />
                <Button label="악성파일 신고" variant="secondary" size="sm" onClick={() => act(`${POST.permlink} 악성파일 신고 — coupon_list.hwp`)} />
              </VStack>
            </VStack>
          </Card>
        </HStack>
      )}

      {/* 조치 이력 — 모든 360 공통 (일급 데이터) */}
      <Card padding={5}>
        <VStack gap={2}><Heading level={4}>조치 이력</Heading><Divider />
          {log.map((l) => <Text key={l} type="supporting" color="secondary">{l}</Text>)}
        </VStack>
      </Card>
    </VStack>
  );
}
