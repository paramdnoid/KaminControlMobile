import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme/theme';

type Props = {
  children: ReactNode;
  compact?: boolean;
};

export function Card({ children, compact = false }: Props) {
  return <View style={[styles.card, compact ? styles.compact : null]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  compact: {
    padding: spacing.md,
  },
});
