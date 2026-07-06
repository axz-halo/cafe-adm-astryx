import { useEffect, useState } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { Avatar } from '@astryxdesign/core/Avatar';
import './login.css';

// ── cafe ADM 로그인 — 몰입형 스플릿 + 모션 (사내 SSO) ──

type SSOProvider = { name: string };
const SSO_PROVIDERS: Record<string, SSOProvider> = {
  'axzcorp.com': { name: 'AXZ 사내 SSO' },
  'kakaocorp.com': { name: '카카오 사내 SSO' },
};
const getProvider = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? (SSO_PROVIDERS[domain] ?? null) : null;
};
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const TAGLINES = [
  '실시간 인기글을 한 곳에서',
  '카테고리 · 트렌드 · 주간/월간까지',
  'AI 초안, 사람의 최종 판단',
];

type Step = 'email' | 'sso-confirm' | 'password-fallback';

export default function LoginSSO({ onLogin }: { onLogin: (ldap: string) => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('halo.wave@axzcorp.com');
  const [password, setPassword] = useState('');
  const [loginFailed, setLoginFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tagIdx, setTagIdx] = useState(0);

  const provider = getProvider(email);
  const emailValid = isValidEmail(email);
  const ldap = email.split('@')[0] ?? '';
  const faviconUrl = `${import.meta.env.BASE_URL}favicon.svg`;

  useEffect(() => {
    const t = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const handleContinue = () => { if (emailValid) setStep(provider ? 'sso-confirm' : 'password-fallback'); };
  const handleBack = () => { setStep('email'); setLoginFailed(false); setIsLoading(false); };
  const handleSso = () => { setIsLoading(true); setTimeout(() => onLogin(ldap), 700); };
  const handleSignIn = () => {
    if (!password) { setLoginFailed(true); return; }
    setIsLoading(true);
    setTimeout(() => onLogin(ldap), 700);
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
          <VStack gap={4} hAlign="stretch">
            {step === 'email' && (
              <div className="login-step">
                <VStack gap={4} hAlign="stretch">
                  <VStack gap={1}>
                    <Text type="display-3" as="h2">로그인</Text>
                    <Text type="body" color="secondary" size="sm">사내 계정으로 통합 운영 어드민에 접속하세요</Text>
                  </VStack>

                  <div onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}>
                    <VStack gap={2}>
                      <TextInput label="사내 이메일" isLabelHidden type="email" placeholder="ldap@axzcorp.com"
                        value={email} onChange={setEmail} size="lg" />
                      {emailValid && provider && (
                        <div className="login-detect"><span className="dot" />{provider.name} 감지됨 · Enter로 계속</div>
                      )}
                    </VStack>
                  </div>

                  <Link href="#" size="sm" color="secondary" type="supporting">로그인에 문제가 있나요?</Link>

                  <Button label={provider ? `${provider.name}로 계속` : 'SSO로 계속'} variant="primary" size="lg" onClick={handleContinue} isDisabled={!emailValid} />
                  <Divider label="또는" />
                  <Button label="비밀번호로 로그인" variant="secondary" size="lg"
                    onClick={() => emailValid && setStep('password-fallback')} isDisabled={!emailValid} />

                  <VStack hAlign="center">
                    <Text type="supporting" color="secondary">권한이 없나요? <Link href="#" type="supporting">권한요청 바로가기</Link></Text>
                  </VStack>
                </VStack>
              </div>
            )}

            {step === 'sso-confirm' && provider && (
              <div className="login-step">
                <VStack gap={4} hAlign="stretch">
                  <VStack gap={2} hAlign="center">
                    <Avatar name={provider.name} size={48} />
                    <Text type="display-3" as="h2">{provider.name}</Text>
                    <Text type="body" color="secondary" size="sm">인증 후 어드민으로 돌아옵니다.</Text>
                  </VStack>
                  <Card padding={0}>
                    <Section variant="muted" padding={4}>
                      <HStack gap={2} vAlign="center">
                        <Icon icon={ShieldCheckIcon} color="secondary" />
                        <VStack gap={0}>
                          <Text type="label">{provider.name}</Text>
                          <Text type="supporting" color="secondary">{email} · LDAP {ldap}</Text>
                        </VStack>
                      </HStack>
                    </Section>
                  </Card>
                  <VStack gap={3}>
                    <Button label={`${provider.name}로 계속`} variant="primary" size="lg" isLoading={isLoading} onClick={handleSso} />
                    <Button label="다른 이메일 사용" variant="ghost" size="lg" onClick={handleBack} />
                  </VStack>
                </VStack>
              </div>
            )}

            {step === 'password-fallback' && (
              <div className="login-step">
                <VStack gap={4} hAlign="stretch">
                  <VStack gap={1} hAlign="center">
                    <Text type="display-3" as="h2">비밀번호 로그인</Text>
                    <Text type="body" color="secondary" size="sm">{email}</Text>
                  </VStack>
                  <VStack gap={4}>
                    <div onKeyDown={(e) => { if (e.key === 'Enter') handleSignIn(); }}>
                      <VStack gap={1}>
                        <TextInput label="비밀번호" type="password" value={password} size="lg"
                          onChange={(v: string) => { setPassword(v); setLoginFailed(false); }}
                          status={loginFailed ? { type: 'error', message: '비밀번호를 입력하세요.' } : undefined} />
                        {loginFailed && (
                          <VStack hAlign="end"><Link href="#" size="sm" color="secondary" type="supporting">비밀번호를 잊으셨나요?</Link></VStack>
                        )}
                      </VStack>
                    </div>
                    <Button label="로그인" variant="primary" size="lg" isLoading={isLoading} onClick={handleSignIn} />
                    <Button label="다른 이메일 사용" variant="ghost" size="lg" onClick={handleBack} />
                  </VStack>
                </VStack>
              </div>
            )}
          </VStack>
        </div>
      </div>
    </div>
  );
}
