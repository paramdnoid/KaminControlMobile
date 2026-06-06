import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/theme';

type Props = {
  title: string;
  meta?: string;
};

export function SectionHeader({ title, meta }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
  },
});
