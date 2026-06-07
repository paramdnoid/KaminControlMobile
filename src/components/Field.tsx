import {
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
} from 'react-native';

import { colors } from '../theme/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Field({ label, error, style, containerStyle, ...inputProps }: Props) {
  return (
    <View style={containerStyle} className="gap-1">
      <Text className="text-xs font-semibold text-muted uppercase tracking-wide">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        placeholderTextColor={colors.mutedLight}
        className={[
          'bg-surface rounded-md border text-base text-ink min-h-[48px] px-3 py-3',
          error ? 'border-danger' : 'border-border',
        ].join(' ')}
        style={style}
        {...inputProps}
      />
      {error ? (
        <Text className="text-small text-danger font-medium">{error}</Text>
      ) : null}
    </View>
  );
}
