import type { ReactNode } from 'react';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';

// 전 화면 공용 페이지 헤더 — 제목/메타/설명/액션의 위치와 타이포 스케일을 통일
export function PageHeader({ title, meta, description, extra, actions }: {
  title: ReactNode; meta?: ReactNode; description?: ReactNode; extra?: ReactNode; actions?: ReactNode;
}) {
  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <StackItem size="fill">
        <VStack gap={1}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Heading level={2}>{title}</Heading>
            {meta}
          </HStack>
          {description && <Text type="supporting" color="secondary">{description}</Text>}
          {extra}
        </VStack>
      </StackItem>
      {actions && <HStack gap={2} vAlign="center" wrap="wrap">{actions}</HStack>}
    </HStack>
  );
}
