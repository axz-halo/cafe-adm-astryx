import { Fragment, useEffect, useMemo, useState } from 'react';
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
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { SmartThumb } from '../SmartThumb';
import { PageHeader } from './PageHeader';
import { fmt, emojiThumb } from './shared';
import { fetchDailyArticles, deriveTrendKeywords, type ApiArticle } from '../api';

// ── 카페 트렌드 (실데이터 파생) ──
// 전용 트렌드 API가 없어 실시간 인기글(/popular/article/daily) corpus에서 제목 키워드 빈도를 집계.
// 키워드 클릭 시 해당 키워드를 포함한 실제 인기글(TOP)을 corpus에서 매핑해 보여준다.

const INITIAL_BLACK = ['이재명', '윤석열', '국민의힘', '국짐', '유시민', '정청래', '줄리', '국힘'];
const emo = ['📰', '🔥', '💬', '📸', '⚡', '🎬', '📝', '❗'];
const pal: [string, string][] = [['#EAF0F7', '#D3E2F0'], ['#FFF1E6', '#FBE0C8'], ['#FCE7E9', '#F6D3D8'], ['#F0ECFB', '#DFD7F4'], ['#EAF7EE', '#D5EEDD']];
const kwThumb = (i: number) => emojiThumb(emo[i % emo.length], pal[i % pal.length][0], pal[i % pal.length][1]);

const FALLBACK: ApiArticle[] = [
  { rnum: 1, grpcode: 'a', grpid: '', fldid: 'A', dataid: '1', title: '손흥민 선제골 직관 후기 모음', cafe: '축구사랑', viewcnt: 65100, cmtcnt: 540, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'a/A/1' },
  { rnum: 2, grpcode: 'b', grpid: '', fldid: 'B', dataid: '2', title: '손흥민 인터뷰 번역본', cafe: '樂soccer', viewcnt: 42000, cmtcnt: 210, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'b/B/2' },
  { rnum: 3, grpcode: 'c', grpid: '', fldid: 'C', dataid: '3', title: '자취요리 초간단 레시피 정리', cafe: '자취생', viewcnt: 38000, cmtcnt: 180, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'c/C/3' },
  { rnum: 4, grpcode: 'd', grpid: '', fldid: 'D', dataid: '4', title: '자취요리 밀프렙 일주일치', cafe: '자취생', viewcnt: 29000, cmtcnt: 90, img: '', link: '#', status: '', regdt: '', nickname: '', permlink: 'd/D/4' },
];

const COL = { rank: 36, mention: 90, views: 110, actions: 150 } as const;

export function Trend() {
  const [sex, setSex] = useState('all');
  const [age, setAge] = useState('all');
  const [corpus, setCorpus] = useState<ApiArticle[] | null>(null);
  const [mode, setMode] = useState<'live' | 'mock' | 'loading'>('loading');
  const [black, setBlack] = useState<string[]>(INITIAL_BLACK);
  const [sel, setSel] = useState<string | null>(null);
  const [newKw, setNewKw] = useState('');

  useEffect(() => {
    let alive = true;
    setMode('loading'); setSel(null);
    fetchDailyArticles({ sex, age, size: 100 })
      .then((arts) => { if (!alive) return; setCorpus(arts); setMode(arts.length ? 'live' : 'mock'); })
      .catch(() => { if (alive) { setCorpus(null); setMode('mock'); } });
    return () => { alive = false; };
  }, [sex, age]);

  const data = mode === 'live' && corpus && corpus.length ? corpus : FALLBACK;
  const words = useMemo(() => deriveTrendKeywords(data, 24).filter((o) => !black.includes(o.w)), [data, black]);
  const removeKw = (w: string) => { setBlack((b) => (b.includes(w) ? b : [...b, w])); if (sel === w) setSel(null); };
  const addBlack = () => { const v = newKw.trim(); if (v && !black.includes(v)) setBlack((b) => [...b, v]); setNewKw(''); };
  const articlesFor = (w: string) => data.filter((a) => a.title.includes(w)).sort((a, b) => b.viewcnt - a.viewcnt).slice(0, 8);

  const headerCell = (label: string, width?: number, end = false) =>
    width ? <HStack width={width} justify={end ? 'end' : 'start'}><Text type="label" color="secondary">{label}</Text></HStack>
          : <StackItem size="fill"><Text type="label" color="secondary">{label}</Text></StackItem>;

  return (
    <VStack gap={5}>
      <PageHeader title="카페 트렌드"
        meta={<>
          {mode === 'live' ? <HStack gap={1} vAlign="center"><StatusDot variant="success" isPulsing label="실데이터" /><Badge variant="green" label="실데이터 파생" /></HStack>
            : mode === 'loading' ? <Badge variant="neutral" label="불러오는 중…" />
            : <HStack gap={1} vAlign="center"><StatusDot variant="warning" label="샘플" /><Badge variant="yellow" label="샘플(폴백)" /></HStack>}
          <Badge variant="blue" label={`키워드 ${words.length}`} />
          <Badge variant="neutral" label={`분석 ${data.length}건`} />
        </>}
        description="실시간 인기글(/popular/article/daily) 제목에서 키워드 빈도를 집계한 급상승 트렌드"
        actions={<>
          <Selector label="성별" isLabelHidden size="md" value={sex} onChange={(v) => v && setSex(v)}
            options={[{ value: 'all', label: '성별 전체' }, { value: 'M', label: '남성' }, { value: 'F', label: '여성' }]} />
          <Selector label="연령" isLabelHidden size="md" value={age} onChange={(v) => v && setAge(v)}
            options={[{ value: 'all', label: '연령 전체' }, ...['10', '20', '30', '40', '50'].map((a) => ({ value: a, label: `${a}대` }))]} />
        </>} />

      {mode === 'mock' && <Banner status="warning" title="샘플 데이터" description="사내망/프록시(/api) 미연결 상태입니다. 실데이터는 사내망에서 표시됩니다." />}
      <Banner status="info" title="집계 기준" description="현재 시간대 실시간 인기글 제목의 키워드 출현 빈도 기준. 위험 키워드는 우측에서 트렌드 노출에서 제외합니다." />

      <HStack gap={4} vAlign="start" wrap="wrap">
        <StackItem size="fill">
          <Card padding={0}>
            <Section padding={4}><HStack gap={2} vAlign="center"><Heading level={4}>급상승 키워드</Heading><Text type="supporting" color="secondary">노출 {words.length}개 · 위험 제외 {black.length}개</Text></HStack></Section>
            <Divider />
            <Section padding={3}><HStack gap={3} vAlign="center">{headerCell('순위', COL.rank)}{headerCell('키워드')}{headerCell('언급', COL.mention, true)}{headerCell('합계 조회', COL.views, true)}{headerCell('관리', COL.actions, true)}</HStack></Section>
            {words.map((o, i) => {
              const open = sel === o.w;
              const arts = open ? articlesFor(o.w) : [];
              return (
                <Fragment key={o.w}>
                  <Divider />
                  <Section padding={3}>
                    <HStack gap={3} vAlign="center">
                      <HStack width={COL.rank}><Text weight="bold" color="secondary">{i + 1}</Text></HStack>
                      <StackItem size="fill"><HStack gap={2} vAlign="center"><Text weight="medium">{o.w}</Text>{i < 3 && <Badge variant="red" label="HOT" />}</HStack></StackItem>
                      <HStack width={COL.mention} justify="end"><Text type="supporting">{o.count}건</Text></HStack>
                      <HStack width={COL.views} justify="end"><Text type="supporting">{fmt(o.views)}</Text></HStack>
                      <HStack width={COL.actions} justify="end" gap={2}>
                        <Button label={open ? '닫기' : '인기글'} variant={open ? 'secondary' : 'ghost'} size="sm" onClick={() => setSel(open ? null : o.w)} />
                        <Button label="제외" variant="secondary" size="sm" onClick={() => removeKw(o.w)} />
                      </HStack>
                    </HStack>
                  </Section>
                  {open && (
                    <Section variant="muted" padding={4}>
                      <VStack gap={3}>
                        <Text weight="bold">🔥 “{o.w}” 대표 인기글 {arts.length}건</Text>
                        <Grid columns={{ minWidth: 260 }} gap={3}>
                          {arts.map((a, j) => (
                            <Card key={a.permlink} padding={3}>
                              <HStack gap={3} vAlign="center">
                                <Text weight="bold" color="secondary">{j + 1}</Text>
                                <SmartThumb src={a.img} fallback={kwThumb(j)} alt={a.title} label={a.title} onClick={() => a.link && a.link !== "#" && window.open(a.link, "_blank")} style={{ width: 48, height: 48 }} />
                                <VStack gap={0}>
                                  <Text weight="medium" maxLines={1}>{a.title}</Text>
                                  <HStack gap={2}><Text type="supporting" color="accent">{a.cafe}</Text><Text type="supporting" color="secondary">👁 {fmt(a.viewcnt)} · 💬 {fmt(a.cmtcnt)}</Text></HStack>
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
            <HStack gap={2} vAlign="center"><Heading level={4}>위험 키워드 관리</Heading><Text type="supporting" color="secondary">트렌드 제외</Text></HStack>
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
