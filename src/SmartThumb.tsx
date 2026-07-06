import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';

// 실 이미지 로드 성공 여부 캐시 (URL 단위, 재프로브 방지)
const cache = new Map<string, boolean>();

// astryx Thumbnail은 onError가 없어 깨진 이미지가 빈 칸이 된다.
// 실 이미지를 백그라운드로 프로브해서 성공 시에만 노출하고, 실패/로딩 중에는 fallback(파스텔)을 보여준다.
export function SmartThumb({ src, fallback, alt, label, onClick, style }: {
  src?: string; fallback: string; alt: string; label: string;
  onClick?: () => void; style?: CSSProperties;
}) {
  const real = src && src.length > 0 ? src : '';
  const [ok, setOk] = useState<boolean>(real ? cache.get(real) === true : false);

  useEffect(() => {
    if (!real) { setOk(false); return; }
    if (cache.has(real)) { setOk(cache.get(real) === true); return; }
    let alive = true;
    const im = new Image();
    im.onload = () => { cache.set(real, true); if (alive) setOk(true); };
    im.onerror = () => { cache.set(real, false); if (alive) setOk(false); };
    im.src = real;
    return () => { alive = false; };
  }, [real]);

  return <Thumbnail src={ok && real ? real : fallback} alt={alt} label={label} onClick={onClick} style={style} />;
}
