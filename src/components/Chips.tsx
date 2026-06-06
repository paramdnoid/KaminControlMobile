import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/theme';

export type ChipOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Array<ChipOption<T>>;
  selected: T[];
  onChange: (selected: T[]) => void;
  multi?: boolean;
};

export function Chips<T extends string>({ options, selected, onChange, multi = true }: Props<T>) {
  function toggle(value: T) {
    if (!multi) {
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }

    onChange(
      selected.includes(value)
        ? selected.filter((current) => current !== value)
        : [...selected, value],
    );
  }

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => toggle(option.value)}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.active : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.label, active ? styles.activeLabel : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  activeLabel: {
    color: colors.surface,
  },
});
