import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { colors, spacing, typography } from '../theme/theme';
import type { ReportBundle } from '../types';
import { formatDate } from '../utils/date';
import { joinAddress } from '../utils/text';
import { Card } from './Card';

type Props = {
  bundle: ReportBundle;
  onOpen: () => void;
};

const statusLabel = {
  draft: 'Entwurf',
  completed: 'Abgeschlossen',
  exported: 'Exportiert',
};

export function ReportCard({ bundle, onOpen }: Props) {
  const { property, report, workItems } = bundle;

  return (
    <Card compact>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.wrap}>
        <View style={styles.main}>
          <Text style={styles.title}>{property.propertyLabel || property.street || 'Rapport'}</Text>
          <Text style={styles.meta}>{joinAddress(property.street, property.postalCode, property.city)}</Text>
          <Text style={styles.meta}>
            {formatDate(report.cleaningDate)} · {workItems.length} Positionen
          </Text>
        </View>
        <View style={styles.side}>
          <Text style={[styles.status, styles[report.status]]}>{statusLabel[report.status]}</Text>
          <ChevronRight color={colors.muted} size={20} />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  main: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
  },
  side: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  status: {
    borderRadius: 999,
    fontSize: typography.label,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  draft: {
    backgroundColor: colors.accentSoft,
    color: colors.warning,
  },
  completed: {
    backgroundColor: colors.infoSoft,
    color: colors.info,
  },
  exported: {
    backgroundColor: colors.primarySoft,
    color: colors.success,
  },
});
