import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { colors, shadow } from '../theme/theme';
import type { ReportBundle } from '../types';
import { formatDate } from '../utils/date';
import { joinAddress } from '../utils/text';

type Props = {
  bundle: ReportBundle;
  onOpen: () => void;
};

type StatusConfig = {
  label: string;
  dot: string;
  text: string;
  bg: string;
};

const STATUS: Record<string, StatusConfig> = {
  draft: {
    label: 'Entwurf',
    dot:   colors.accent,
    text:  'text-warning',
    bg:    'bg-accent-soft',
  },
  completed: {
    label: 'Abgeschlossen',
    dot:   colors.info,
    text:  'text-info',
    bg:    'bg-info-soft',
  },
  exported: {
    label: 'Exportiert',
    dot:   colors.success,
    text:  'text-success',
    bg:    'bg-primary-soft',
  },
};

export function ReportCard({ bundle, onOpen }: Props) {
  const { property, report, workItems } = bundle;
  const s = STATUS[report.status] ?? STATUS.draft;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rapport ${property.propertyLabel || property.street || ''}, ${s.label}, ${formatDate(report.cleaningDate)}`}
      onPress={onOpen}
      className="bg-surface rounded-lg border border-border p-3.5"
      style={({ pressed }) => [shadow.card, pressed ? { opacity: 0.75 } : undefined]}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-bold text-ink leading-[22px]" numberOfLines={1}>
            {property.propertyLabel || property.street || 'Rapport'}
          </Text>
          <Text className="text-small text-muted leading-[18px]" numberOfLines={1}>
            {joinAddress(property.street, property.postalCode, property.city)}
          </Text>
          <Text className="text-small text-muted leading-[18px]">
            {formatDate(report.cleaningDate)} · {workItems.length} Positionen
          </Text>
        </View>

        <View className="items-end gap-2">
          {/* Status badge with dot */}
          <View className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${s.bg}`}>
            <View
              className="rounded-full w-1.5 h-1.5"
              style={{ backgroundColor: s.dot }}
            />
            <Text className={`text-small font-semibold ${s.text}`}>{s.label}</Text>
          </View>
          <ChevronRight color={colors.mutedLight} size={18} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}
