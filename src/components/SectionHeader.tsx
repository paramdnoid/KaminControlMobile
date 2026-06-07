import { Text, View } from 'react-native';

type Props = {
  title: string;
  meta?: string;
};

export function SectionHeader({ title, meta }: Props) {
  return (
    <View className="border-t border-divider mt-2 pt-3 gap-0.5">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-h2 font-bold text-ink tracking-tight">{title}</Text>
        {meta ? (
          <Text className="text-small text-muted-light shrink text-right">{meta}</Text>
        ) : null}
      </View>
    </View>
  );
}
