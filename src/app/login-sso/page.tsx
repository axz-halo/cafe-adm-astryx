import { useEffect, useState } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Center } from '@astryxdesign/core/Center';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { Avatar } from '@astryxdesign/core/Avatar';

// ── cafe ADM 로그인 (astryx login-sso 템플릿 기반, 사내 SSO 적용) ──

// 브랜드 배경은 light.css의 #root.login-bg 규칙으로 적용

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

type Step = 'email' | 'sso-confirm' | 'password-fallback';

export default function LoginSSO({ onLogin }: { onLogin: (ldap: string) => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('halo.wave@axzcorp.com');
  const [password, setPassword] = useState('');
  const [loginFailed, setLoginFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const provider = getProvider(email);
  const emailValid = isValidEmail(email);
  const ldap = email.split('@')[0] ?? '';

  // 로그인 화면 동안 브랜드 배경 적용 — 테마 런타임이 style 속성을 초기화하므로 클래스로 적용
  useEffect(() => {
    const root = document.getElementById('root');
    root?.classList.add('login-bg');
    return () => root?.classList.remove('login-bg');
  }, []);

  const handleContinue = () => {
    if (!emailValid) return;
    setStep(provider ? 'sso-confirm' : 'password-fallback');
  };
  const handleBack = () => { setStep('email'); setLoginFailed(false); setIsLoading(false); };
  const handleSso = () => {
    setIsLoading(true);
    setTimeout(() => onLogin(ldap), 700);
  };
  const handleSignIn = () => {
    if (!password) { setLoginFailed(true); return; }
    setIsLoading(true);
    setTimeout(() => onLogin(ldap), 700);
  };

  return (
    <Center axis="both" height="100dvh" width="100%">
      <Card padding={8} width="100%" maxWidth={400}>
        <VStack gap={4} hAlign="stretch">
          {/* ── 1단계: 이메일 입력 ── */}
          {step === 'email' && (
            <>
              <VStack gap={1} hAlign="center">
                <HStack gap={2} vAlign="center"><Text type="display-2" as="h2" color="accent">cafe</Text><Text type="display-2" as="h2">ADM</Text></HStack>
                <Text type="body" color="secondary" size="sm">사내 계정으로 통합 운영 어드민에 로그인하세요</Text>
              </VStack>

              <VStack gap={2}>
                <TextInput label="사내 이메일" isLabelHidden type="email" placeholder="ldap@axzcorp.com"
                  value={email} onChange={setEmail} size="lg" />
              </VStack>

              <Link href="#" size="sm" color="secondary" type="supporting">로그인에 문제가 있나요?</Link>

              <Button label="SSO로 계속" variant="primary" size="lg" onClick={handleContinue} isDisabled={!emailValid} />

              <Divider label="또는" />

              <Button label="비밀번호로 로그인" variant="secondary" size="lg"
                onClick={() => emailValid && setStep('password-fallback')} isDisabled={!emailValid} />

              <VStack hAlign="center">
                <Text type="supporting" color="secondary">
                  권한이 없나요? <Link href="#" type="supporting">권한요청 바로가기</Link>
                </Text>
              </VStack>
            </>
          )}

          {/* ── 2a단계: SSO 확인 ── */}
          {step === 'sso-confirm' && provider && (
            <>
              <VStack gap={2} hAlign="center">
                <Avatar name={provider.name} size={48} />
                <Text type="display-3" as="h2">{provider.name} 로그인</Text>
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
            </>
          )}

          {/* ── 2b단계: 비밀번호 폴백 ── */}
          {step === 'password-fallback' && (
            <>
              <VStack gap={1} hAlign="center">
                <Text type="display-1" as="h2">비밀번호 로그인</Text>
                <Text type="body" color="secondary" size="sm">{email}</Text>
              </VStack>

              <VStack gap={4}>
                <VStack gap={1}>
                  <TextInput label="비밀번호" type="password" value={password} size="lg"
                    onChange={(v: string) => { setPassword(v); setLoginFailed(false); }}
                    status={loginFailed ? { type: 'error', message: '비밀번호를 입력하세요.' } : undefined} />
                  {loginFailed && (
                    <VStack hAlign="end">
                      <Link href="#" size="sm" color="secondary" type="supporting">비밀번호를 잊으셨나요?</Link>
                    </VStack>
                  )}
                </VStack>

                <Button label="로그인" variant="primary" size="lg" isLoading={isLoading} onClick={handleSignIn} />
                <Button label="다른 이메일 사용" variant="ghost" size="lg" onClick={handleBack} />
              </VStack>
            </>
          )}
        </VStack>
      </Card>
    </Center>
  );
}
