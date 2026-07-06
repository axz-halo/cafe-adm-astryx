// cafe-popular-api 실데이터 연동
// 경로: /api → proxy_server.py(:5871) → cbt2-cafe-popular-api.dev.daum.net (사내망 전용)
// 엔드포인트/스키마는 cafe-popular-api-develop 소스 기준.
// 실패(비사내망·배포본 등) 시 throw → 각 뷰가 목데이터로 폴백한다.

const BASE = '/api';

// 응답의 카페명/제목/카테고리명은 &#65290; 형태의 수치 엔티티로 인코딩되어 옴 → 디코드 필요
export function decodeEntities(s: string): string {
  return (s || '')
    .replace(/&#(\d+);/g, (_, n) => cp(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => cp(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
// 이모지 등 BMP 밖 코드포인트도 정상 복원
function cp(n: number): string {
  try { return String.fromCodePoint(n); } catch { return ''; }
}

// 카페 첨부 이미지는 핫링크 보호가 있어 프록시(/img)로 중계
export function proxiedImg(url: string): string {
  return url ? `/img?u=${encodeURIComponent(url)}` : '';
}

async function getJson(path: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + path, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ── 인기글 (PopularArticle DTO) ──
export type ApiArticle = {
  rnum: number; grpid: string; grpcode: string; fldid: string; dataid: string;
  title: string; cafe: string; viewcnt: number; cmtcnt: number;
  img: string; link: string; status: string; regdt: string; nickname: string; permlink: string;
};

const mapArticle = (a: Record<string, unknown>): ApiArticle => {
  const imgs = (a.imgurls as string[] | undefined) ?? [];
  return {
    rnum: Number(a.rnum ?? 0), grpid: String(a.grpid ?? ''), grpcode: String(a.grpcode ?? ''),
    fldid: String(a.fldid ?? ''), dataid: String(a.dataid ?? ''),
    title: decodeEntities(String(a.title ?? '')), cafe: decodeEntities(String(a.grpname ?? '')),
    viewcnt: Number(a.viewcnt ?? 0), cmtcnt: Number(a.cmtcnt ?? 0),
    img: proxiedImg((imgs[0] as string) || String(a.imgurl ?? '')), link: String(a.link ?? ''),
    status: String(a.status ?? ''), regdt: String(a.regdt ?? ''), nickname: decodeEntities(String(a.nickname ?? '')),
    permlink: `${a.grpcode}/${a.fldid}/${a.dataid}`,
  };
};

// 노출 인기글(실시간) — GET /popular/article/daily
export async function fetchDailyArticles(p: { age?: string; sex?: string; size?: number; grpid?: string; hour?: string } = {}): Promise<ApiArticle[]> {
  const q = new URLSearchParams({ age: p.age ?? 'all', sex: p.sex ?? 'all', size: String(p.size ?? 100), grpid: p.grpid ?? 'all', page: '1' });
  if (p.hour) q.set('hour', p.hour);
  const d = await getJson(`/popular/article/daily?${q.toString()}`);
  return ((d.articles ?? []) as Record<string, unknown>[]).map(mapArticle);
}

// 주간/월간 — GET /popular/{weekly|monthly}/articles/{aggdt}
// aggdt는 배치일(주간=월요일, 월간=1일)에 의존 → 최근 후보를 순서대로 시도해 데이터 있는 첫 배치 사용
export function weeklyAggdtCandidates(now = new Date()): string[] {
  const d = new Date(now);
  const day = d.getDay(); // 0=일
  const diff = (day + 6) % 7; // 이번 주 월요일까지 거리
  d.setDate(d.getDate() - diff);
  const out: string[] = [];
  for (let i = 0; i < 5; i++) { out.push(ymd(d)); d.setDate(d.getDate() - 7); }
  return out;
}
export function monthlyAggdtCandidates(now = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < 4; i++) { out.push(ymd(d)); d.setMonth(d.getMonth() - 1); }
  return out;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function fetchPastArticles(period: 'weekly' | 'monthly', aggdts: string[], size = 100): Promise<{ aggdt: string; articles: ApiArticle[] }> {
  for (const aggdt of aggdts) {
    const d = await getJson(`/popular/${period}/articles/${aggdt}?size=${size}`);
    const arts = (d.articles ?? []) as Record<string, unknown>[];
    if (arts.length) return { aggdt, articles: arts.map(mapArticle) };
  }
  return { aggdt: aggdts[0] ?? '', articles: [] };
}

// ── 카테고리 인기글 — GET /popular/categorized/article/{y}/{m}/{d} ──
export type ApiCategoryArticle = { title: string; cafe: string; grpcode: string; fldid: string; dataid: number; img: string; viewCount: number; commentCount: number; url: string };
export type ApiCategory = { id: number; name: string; articles: ApiCategoryArticle[] };

export async function fetchCategoryArticles(y: number, mo: number, day: number, categoryCount = 12, articleCount = 20): Promise<ApiCategory[]> {
  const d = await getJson(`/popular/categorized/article/${y}/${mo}/${day}?categoryCount=${categoryCount}&articleCount=${articleCount}`);
  const byId = new Map<number, ApiCategory>();
  for (const it of (d.articles ?? []) as Record<string, any>[]) {
    const id = Number(it.category?.id ?? 0);
    if (!byId.has(id)) byId.set(id, { id, name: decodeEntities(String(it.category?.name ?? '')), articles: [] });
    byId.get(id)!.articles.push({
      title: decodeEntities(String(it.title ?? '')), cafe: decodeEntities(String(it.cafe?.grpName ?? '')),
      grpcode: String(it.cafe?.grpCode ?? ''), fldid: String(it.config?.fldId ?? ''), dataid: Number(it.config?.dataId ?? 0),
      img: proxiedImg(String(it.image ?? '')), viewCount: Number(it.viewCount ?? 0), commentCount: Number(it.commentCount ?? 0), url: String(it.url ?? ''),
    });
  }
  return [...byId.values()];
}

// ── 트렌드 파생 — 전용 API가 없어 실시간 인기글 corpus에서 키워드 빈도 집계 ──
const STOP = new Set(['그리고', '하는', '있는', '없는', '너무', '진짜', '오늘', '근황', 'the', 'jpg', 'twt', 'gif', 'feat', '이거', '이건', '근데', '해서', '하고', '보고', '보는', '있다', '했다']);
export function deriveTrendKeywords(articles: ApiArticle[], limit = 20): { w: string; count: number; views: number }[] {
  const map = new Map<string, { count: number; views: number }>();
  for (const a of articles) {
    const tokens = (a.title.match(/[가-힣A-Za-z0-9]{2,}/g) ?? []).filter((w) => w.length >= 2 && !STOP.has(w.toLowerCase()));
    for (const w of new Set(tokens)) {
      const cur = map.get(w) ?? { count: 0, views: 0 };
      cur.count += 1; cur.views += a.viewcnt;
      map.set(w, cur);
    }
  }
  return [...map.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([w, v]) => ({ w, count: v.count, views: v.views }))
    .sort((a, b) => b.count - a.count || b.views - a.views)
    .slice(0, limit);
}
