import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, FilePlus2 } from 'lucide-react-native';

import { displayBuildingType, displayFuelTypes } from '../data/options';
import { colors, spacing, typography } from '../theme/theme';
import type { CustomerProperty } from '../types';
import { joinAddress } from '../utils/text';
import { Button } from './Button';
import { Card } from './Card';

type Props = {
  property: CustomerProperty;
  onOpen: () => void;
  onCreateReport: () => void;
};

export function PropertyCard({ property, onOpen, onCreateReport }: Props) {
  return (
    <Card compact>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.openArea}>
        <View style={styles.titleLine}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{property.propertyLabel || property.street || 'Liegenschaft'}</Text>
            <Text style={styles.meta}>
              {property.customerNumber ? `Nr. ${property.customerNumber} · ` : ''}
              {joinAddress(property.street, property.postalCode, property.city)}
            </Text>
          </View>
          <ChevronRight color={colors.muted} size={20} />
        </View>
        <View style={styles.tags}>
          <Text style={styles.tag}>{displayBuildingType(property.buildingType, property.otherBuildingType)}</Text>
          <Text style={styles.tag}>{displayFuelTypes(property.fuelTypes)}</Text>
          {property.tour ? <Text style={styles.tag}>Tour {property.tour}</Text> : null}
        </View>
      </Pressable>
      <Button label="Rapport starten" icon={FilePlus2} onPress={onCreateReport} variant="secondary" />
    </Card>
  );
}

const styles = StyleSheet.create({
  openArea: {
    gap: spacing.md,
  },
  titleLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  titleBlock: {
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
    lineHeight: 19,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
