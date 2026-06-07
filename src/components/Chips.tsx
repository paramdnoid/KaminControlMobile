import { Pressable, Text, View } from 'react-native';

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
        ? selected.filter((c) => c !== value)
        : [...selected, value],
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => toggle(option.value)}
            className={[
              'rounded-full min-h-[44px] px-4 py-1.5 items-center justify-center',
              active
                ? 'bg-primary'
                : 'bg-surface border border-border',
            ].join(' ')}
            style={({ pressed }) => pressed ? { opacity: 0.75, transform: [{ scale: 0.97 }] } : undefined}
          >
            <Text
              className={`text-small font-semibold ${active ? 'text-white' : 'text-muted'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
