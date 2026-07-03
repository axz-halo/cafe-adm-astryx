// 뷰 공용 유틸 — 수치 포맷 + 이모지 썸네일 SVG 에셋
export const fmt = (v: number) => (v >= 10000 ? (v / 10000).toFixed(1).replace(/\.0$/, '') + '만' : v.toLocaleString());

export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h;
};

// 파스텔 그라데이션 썸네일 (실서비스 썸네일 자리 — 아티팩트 팔레트)
export const emojiThumb = (emoji: string, c1: string, c2: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='640' height='640' fill='url(#g)'/><circle cx='545' cy='95' r='120' fill='#FFFFFF' opacity='0.35'/><circle cx='105' cy='545' r='85' fill='#FFFFFF' opacity='0.25'/><text x='320' y='390' font-size='190' text-anchor='middle'>${emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

export const PASTEL: Record<string, [string, string]> = {
  일상: ['#FFF1E6', '#FBE0C8'], 스포츠: ['#E8F0FF', '#D1E1FC'], 유머: ['#FDEAF0', '#F6D3E0'], 동물: ['#F0ECFB', '#DFD7F4'],
  정보: ['#EAF0F7', '#D3E2F0'], 연예: ['#FCE7E9', '#F6D3D8'], 취미: ['#EAF7EE', '#D5EEDD'], 사회: ['#EEF1F4', '#DEE3EA'],
};
