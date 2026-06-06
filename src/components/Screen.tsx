import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { shadow } from '../theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Screen({ title, subtitle, children, footer }: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-1 self-center max-w-shell w-full">
        <ScrollView
          contentContainerClassName="gap-4 p-4 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-1 pt-2 pb-1">
            <Text className="text-title font-extrabold text-ink tracking-tight">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-base text-muted leading-6">{subtitle}</Text>
            ) : null}
          </View>
          {children}
        </ScrollView>
        {footer ? (
          <SafeAreaView
            edges={['bottom']}
            className="bg-surface border-t border-border p-3"
            style={shadow.elevated}
          >
            {footer}
          </SafeAreaView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
