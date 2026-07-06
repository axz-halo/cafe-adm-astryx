import { useEffect, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import './login.css';

// ── cafe ADM 로그인 — LDAP ID(사내 계정) 로그인 (레거시 cafe-adm 방식) ──
// SSO 제거. 로그인 식별자는 LDAP accountId (예: halo.wave) — 사번(employeeNo)이 아님.
// 레거시 인증: HelloMIS POST /rest/identity/members/auth (id, pw). accountId=로그인ID, employeeNo(사번)는 인증 후 속성.

const TAGLINES = [
  '실시간 인기글을 한 곳에서',
  '카테고리 · 트렌드 · 주간/월간까지',
  'AI 초안, 사람의 최종 판단',
];

// 사내 인증 — serve.py /auth 프록시가 helloMIS(LDAP)로 id·pw 검증.
// serve.py에 CAFEADM_HELLOMIS_URL/KEY 설정 시 실검증, 미설정 시 데모 통과.
// /auth 자체가 없는 정적 배포(예: GitHub Pages)에서는 데모 통과로 폴백.
async function authenticate(ldapId: string, password: string): Promise<{ ok: boolean; mode: string }> {
  try {
    const res = await fetch('/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ldapId, pw: password }),
    });
    if (!res.ok) throw new Error('no-backend');
    const data = await res.json();
    return { ok: !!data.ok, mode: String(data.mode ?? 'dev') };
  } catch {
    // /auth 없음(정적 배포 등) → 데모 통과
    return { ok: ldapId.trim().length > 0 && password.length > 0, mode: 'demo' };
  }
}

export default function LoginSSO({ onLogin }: { onLogin: (id: string, mode?: string) => void }) {
  const [ldapId, setLdapId] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tagIdx, setTagIdx] = useState(0);

  const canSubmit = ldapId.trim().length > 0 && password.length > 0;
  const faviconUrl = `${import.meta.env.BASE_URL}favicon.svg`;

  useEffect(() => {
    const t = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const handleSignIn = async () => {
    if (!canSubmit) { setFailed(true); return; }
    setIsLoading(true);
    setFailed(false);
    const { ok, mode } = await authenticate(ldapId, password);
    if (ok) { onLogin(ldapId.trim(), mode); }
    else { setFailed(true); setIsLoading(false); }
  };

  return (
    <div className="login-shell">
      {/* 브랜드 히어로 */}
      <div className="login-hero">
        <div className="login-brand">
          <div className="login-logo-wrap">
            <div className="login-steam" aria-hidden><i /><i /><i /></div>
            <img className="login-logo" src={faviconUrl} alt="Daum Cafe" />
          </div>
          <div className="login-hgroup">
            <div className="login-title">Daum Cafe <b>Admin</b></div>
            <div className="login-sub">다음카페 통합 운영 어드민</div>
          </div>
        </div>
        <div className="login-tags">
          <div className="login-tag" key={tagIdx}>{TAGLINES[tagIdx]}</div>
        </div>
        <div className="login-feats">
          <span className="login-chip">실시간 인기글</span>
          <span className="login-chip">카테고리 인기글</span>
          <span className="login-chip">카페 트렌드</span>
          <span className="login-chip">주간·월간</span>
        </div>
      </div>

      {/* 폼 패널 */}
      <div className="login-panel">
        <div className="login-card">
          <div className="login-step">
            <VStack gap={4} hAlign="stretch">
              <VStack gap={1}>
                <Text type="display-3" as="h2">로그인</Text>
                <Text type="body" color="secondary" size="sm">사내 계정(LDAP)으로 통합 운영 어드민에 접속하세요</Text>
              </VStack>

              <div onKeyDown={(e) => { if (e.key === 'Enter') handleSignIn(); }}>
                <VStack gap={3}>
                  <TextInput label="LDAP ID" type="text" placeholder="사내 계정 (예: halo.wave)"
                    value={ldapId} size="lg"
                    onChange={(v: string) => { setLdapId(v); setFailed(false); }} />
                  <TextInput label="비밀번호" type="password" placeholder="비밀번호"
                    value={password} size="lg"
                    onChange={(v: string) => { setPassword(v); setFailed(false); }}
                    status={failed ? { type: 'error', message: 'LDAP ID와 비밀번호를 확인하세요.' } : undefined} />
                </VStack>
              </div>

              <HStack gap={2} vAlign="center" justify="between">
                <Link href="#" size="sm" color="secondary" type="supporting">비밀번호를 잊으셨나요?</Link>
              </HStack>

              <Button label="로그인" variant="primary" size="lg" isLoading={isLoading} onClick={handleSignIn} isDisabled={!canSubmit} />

              <VStack hAlign="center">
                <Text type="supporting" color="secondary">권한이 없나요? <Link href="#" type="supporting">권한요청 바로가기</Link></Text>
              </VStack>
            </VStack>
          </div>
        </div>
      </div>
    </div>
  );
}
