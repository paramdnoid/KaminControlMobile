import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { shadow } from '../theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function Screen({ title, subtitle, eyebrow, headerRight, children, footer }: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-1 self-center max-w-shell w-full">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-start justify-between gap-3 pt-3 pb-1">
            <View className="flex-1 gap-1">
              {eyebrow ? (
                <Text className="text-eyebrow font-bold text-primary uppercase">
                  {eyebrow}
                </Text>
              ) : null}
              <Text className="text-title font-extrabold text-ink tracking-tight">
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-base text-muted leading-6">{subtitle}</Text>
              ) : null}
            </View>
            {headerRight ? <View className="pt-1">{headerRight}</View> : null}
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
