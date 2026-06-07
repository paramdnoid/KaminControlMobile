import { Pressable, Text, View } from 'react-native';

import { shadow } from '../theme/theme';

export type SegmentOption = {
  key: string;
  label: string;
};

type Props = {
  options: SegmentOption[];
  value: string;
  onChange: (key: string) => void;
};

export function SegmentedTabs({ options, value, onChange }: Props) {
  return (
    <View className="flex-row bg-surface-muted rounded-lg p-1 gap-1">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.key)}
            className={`flex-1 items-center justify-center rounded-md min-h-[44px] px-2 ${active ? 'bg-surface' : ''}`}
            style={active ? shadow.card : undefined}
          >
            <Text
              numberOfLines={1}
              className={`text-small font-semibold ${active ? 'text-primary' : 'text-muted'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
