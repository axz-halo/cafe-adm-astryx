import { useEffect, useState } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Token } from '@astryxdesign/core/Token';
import { Kbd } from '@astryxdesign/core/Kbd';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Selector } from '@astryxdesign/core/Selector';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';

// ── 검수 모드 — 마스터·디테일 트리아지 콘솔 ──
// 좌: 콘텐츠 큐(클릭=미리보기) · 우: 대형 프리뷰 + 고정 액션 · 처리 시 자동으로 다음 글 선택
export type TriageItem = {
  r: number; title: string; cafe: string; uv: number;
  flags: string[]; thumb: string; cat?: string; catSuggest: string[];
};

export function Triage({ items, categories, processed, total, counts, onExpose, onMove, onExclude, onCat }: {
  items: TriageItem[]; categories: string[]; processed: number; total: number;
  counts: { exposed: number; moved: number; excluded: number };
  onExpose: (r: number) => void; onMove: (r: number) => void; onExclude: (r: number) => void; onCat: (r: number, c: string) => void;
}) {
  const [pass, setPass] = useState<'all' | 'flagged' | 'uncat'>('all');
  const [selIdx, setSelIdx] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [bulkCat, setBulkCat] = useState<string | null>(null);

  const queue = items.filter((a) => (pass === 'all' ? true : pass === 'flagged' ? a.flags.length > 0 : !a.cat));
  const curIdx = Math.min(selIdx, Math.max(queue.length - 1, 0));
  const cur = queue[curIdx]; // 처리되면 같은 인덱스에 다음 글이 자동으로 들어옴 (자동 진행)

  // 키보드 가속기(선택): ↑↓ 이동 · E 노출 · M 이동 · X 노출제외 · 1~3 카테고리
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t?.tagName ?? '') || t?.isContentEditable || !cur) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { setSelIdx((c) => Math.min(c + 1, queue.length - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { setSelIdx((c) => Math.max(c - 1, 0)); e.preventDefault(); }
      else if (e.key === 'e' || e.key === 'E') onExpose(cur.r);
      else if (e.key === 'm' || e.key === 'M') onMove(cur.r);
      else if (e.key === 'x' || e.key === 'X') onExclude(cur.r);
      else if (['1', '2', '3'].includes(e.key)) { const c = cur.catSuggest[Number(e.key) - 1]; if (c) onCat(cur.r, c); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [cur, queue.length, onExpose, onMove, onExclude, onCat]);

  const toggleCheck = (r: number) => setChecked((s) => { const n = new Set(s); n.has(r) ? n.delete(r) : n.add(r); return n; });
  const bulk = (fn: (r: number) => void) => { checked.forEach(fn); setChecked(new Set()); };

  return (
    <VStack gap={4}>
      {/* 진행 스트립: 진행률 + 처리 집계 + 패스 전환 */}
      <Card padding={4}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={2}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text weight="bold">처리 진행</Text>
                <Text type="supporting" color="secondary">{processed} / {total}건 · 이 패스 대기 {queue.length}건</Text>
                <Badge variant="green" label={`노출 ${counts.exposed}`} />
                <Badge variant="blue" label={`이동완료 ${counts.moved}`} />
                <Badge variant="neutral" label={`노출제외 ${counts.excluded}`} />
              </HStack>
              <ProgressBar label="처리 진행" isLabelHidden value={processed} max={total} variant={processed >= total ? 'success' : 'accent'} />
            </VStack>
          </StackItem>
          <SegmentedControl value={pass} onChange={(v) => { setPass(v as never); setSelIdx(0); }} label="검수 패스" size="md">
            <SegmentedControlItem value="flagged" label={`① 플래그 ${items.filter((a) => a.flags.length > 0).length}`} />
            <SegmentedControlItem value="uncat" label={`② 분류 대기 ${items.filter((a) => !a.cat).length}`} />
            <SegmentedControlItem value="all" label={`전체 ${items.length}`} />
          </SegmentedControl>
        </HStack>
      </Card>

      {/* 선택 모드 + 일괄 처리 바 */}
      <HStack gap={2} vAlign="center" wrap="wrap">
        <ToggleButton size="sm" label={`선택 모드${checked.size ? ` (${checked.size}건)` : ''}`} isPressed={selectMode}
          onPressedChange={(p) => { setSelectMode(p); if (!p) setChecked(new Set()); }} />
        {selectMode && (<>
          <Selector label="일괄 카테고리" isLabelHidden size="sm" placeholder="카테고리" options={categories} value={bulkCat} onChange={setBulkCat} hasClear />
          <Button label="카테고리 적용" size="sm" variant="secondary" isDisabled={!checked.size || !bulkCat} onClick={() => bulkCat && bulk((r) => onCat(r, bulkCat))} />
          <Button label="일괄 노출" size="sm" variant="primary" isDisabled={!checked.size} onClick={() => bulk(onExpose)} />
          <Button label="일괄 이동" size="sm" variant="secondary" isDisabled={!checked.size} onClick={() => bulk(onMove)} />
          <Button label="일괄 노출제외" size="sm" variant="secondary" isDisabled={!checked.size} onClick={() => bulk(onExclude)} />
        </>)}
        {!selectMode && <Text type="supporting" color="secondary">글을 클릭하면 우측에 미리보기 · 처리하면 자동으로 다음 글로 넘어갑니다</Text>}
      </HStack>

      {/* 마스터(큐 리스트) · 디테일(프리뷰) */}
      <HStack gap={4} vAlign="start" wrap="wrap">
        <StackItem size="fill">
          <Card padding={0}>
            <List density="compact" hasDividers header={
              <HStack gap={2} vAlign="center"><Heading level={4}>콘텐츠 큐</Heading><Text type="supporting" color="secondary">{queue.length}건 대기</Text></HStack>
            }>
              {queue.map((a, i) => (
                <ListItem key={a.r} label={a.title}
                  isSelected={!selectMode && i === curIdx}
                  onClick={() => (selectMode ? toggleCheck(a.r) : setSelIdx(i))}
                  startContent={<Thumbnail src={a.thumb} alt={a.title} label={a.title} style={{ width: 40, height: 40 }} />}
                  description={`${a.cafe} · UV ${a.uv.toLocaleString()}`}
                  endContent={
                    <HStack gap={1} vAlign="center" wrap="wrap">
                      {a.cat && <Badge variant="cyan" label={a.cat} />}
                      {a.flags.map((f) => <Badge key={f} variant="yellow" label={f} />)}
                      {selectMode && <Badge variant={checked.has(a.r) ? 'blue' : 'neutral'} label={checked.has(a.r) ? '✓ 선택됨' : '선택'} />}
                    </HStack>
                  }
                />
              ))}
            </List>
            {queue.length === 0 && <Card padding={6}><Text type="supporting" color="secondary">이 패스의 대기 항목이 없습니다 — 다음 패스로 이동하세요.</Text></Card>}
          </Card>
        </StackItem>

        {/* 프리뷰 패널 — 액션이 항상 같은 위치에 고정 */}
        {cur && (
          <Card padding={4} width={400}>
            <VStack gap={3}>
              <HStack gap={2} vAlign="center">
                <Heading level={4}>미리보기</Heading>
                <Text type="supporting" color="secondary">{curIdx + 1} / {queue.length}</Text>
              </HStack>
              <Thumbnail src={cur.thumb} alt={cur.title} label={cur.title} style={{ width: '100%', height: 'auto' }} />
              <VStack gap={1}>
                <Text weight="semibold">{cur.title}</Text>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Text type="supporting" color="accent">{cur.cafe}</Text>
                  <Text type="supporting" color="secondary">UV {cur.uv.toLocaleString()}</Text>
                  {cur.flags.map((f) => <Badge key={f} variant="yellow" label={f} />)}
                </HStack>
              </VStack>
              <Divider />
              <VStack gap={2}>
                <HStack gap={2} vAlign="center"><Text type="label">추천 카테고리</Text><Kbd keys="1 2 3" /></HStack>
                <HStack gap={1} wrap="wrap">
                  {cur.catSuggest.slice(0, 3).map((c) => (
                    <Token key={c} label={c} size="md" color={cur.cat === c ? 'blue' : 'default'} onClick={() => onCat(cur.r, c)} />
                  ))}
                </HStack>
              </VStack>
              <Divider />
              <VStack gap={2}>
                <HStack gap={2}>
                  <StackItem size="fill"><Button label="노출" variant="primary" size="md" onClick={() => onExpose(cur.r)} /></StackItem>
                  <StackItem size="fill"><Button label="이동" variant="secondary" size="md" onClick={() => onMove(cur.r)} /></StackItem>
                  <StackItem size="fill"><Button label="노출제외" variant="secondary" size="md" onClick={() => onExclude(cur.r)} /></StackItem>
                </HStack>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Kbd keys="E" /><Text type="supporting" color="secondary">노출</Text>
                  <Kbd keys="M" /><Text type="supporting" color="secondary">이동</Text>
                  <Kbd keys="X" /><Text type="supporting" color="secondary">노출제외</Text>
                  <Kbd keys="↑ ↓" /><Text type="supporting" color="secondary">큐 탐색</Text>
                </HStack>
              </VStack>
            </VStack>
          </Card>
        )}
      </HStack>
    </VStack>
  );
}
