import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors } from '../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:   'bg-primary',
  secondary: 'bg-primary-soft border border-primary',
  ghost:     'bg-transparent border border-border',
  danger:    'bg-danger',
};

const iconColor: Record<ButtonVariant, string> = {
  primary:   colors.surface,
  secondary: colors.primary,
  ghost:     colors.primary,
  danger:    colors.surface,
};

const labelClass: Record<ButtonVariant, string> = {
  primary:   'text-white',
  secondary: 'text-primary',
  ghost:     'text-primary',
  danger:    'text-white',
};

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  children,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      className={[
        'flex-row items-center justify-center rounded-md min-h-[48px] px-4 py-3 gap-2',
        variantClass[variant],
        disabled ? 'opacity-40' : '',
      ].join(' ')}
      style={({ pressed }) => pressed && !disabled ? { opacity: 0.78, transform: [{ scale: 0.98 }] } : undefined}
    >
      {loading ? (
        <ActivityIndicator color={iconColor[variant]} />
      ) : Icon ? (
        <Icon color={iconColor[variant]} size={18} strokeWidth={2} />
      ) : null}
      <View className="shrink">
        <Text
          numberOfLines={2}
          className={`text-base font-semibold text-center ${labelClass[variant]}`}
        >
          {label}
        </Text>
        {children}
      </View>
    </Pressable>
  );
}
