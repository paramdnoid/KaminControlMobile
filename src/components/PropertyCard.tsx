import { Pressable, Text, View } from 'react-native';
import { ChevronRight, FilePlus2 } from 'lucide-react-native';

import { displayBuildingType, displayFuelTypes } from '../data/options';
import { colors, shadow } from '../theme/theme';
import type { CustomerProperty } from '../types';
import { joinAddress } from '../utils/text';

type Props = {
  property: CustomerProperty;
  onOpen: () => void;
  onCreateReport: () => void;
};

export function PropertyCard({ property, onOpen, onCreateReport }: Props) {
  const hasTags =
    !!property.buildingType ||
    property.fuelTypes.length > 0 ||
    !!property.tour ||
    property.sourceSystem === 'genesis' ||
    property.isActive === false;

  return (
    <View
      className="bg-surface rounded-md border border-border overflow-hidden"
      style={shadow.card}
    >
      {/* Tap to navigate → property detail */}
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        className="p-3 gap-2"
        style={({ pressed }) => pressed ? { opacity: 0.7 } : undefined}
      >
        <View className="flex-row items-center gap-2">
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-ink leading-[22px]" numberOfLines={1}>
              {property.propertyLabel || property.street || 'Liegenschaft'}
            </Text>
            <Text className="text-small text-muted leading-[18px]" numberOfLines={1}>
              {property.customerNumber ? `Nr. ${property.customerNumber} · ` : ''}
              {joinAddress(property.street, property.postalCode, property.city)}
            </Text>
          </View>
          <ChevronRight color={colors.mutedLight} size={18} strokeWidth={2} />
        </View>

        {hasTags ? (
          <View className="flex-row flex-wrap gap-1">
            {property.buildingType ? (
              <Text className="text-small text-muted font-medium bg-surface-muted rounded-full px-2 py-0.5">
                {displayBuildingType(property.buildingType, property.otherBuildingType)}
              </Text>
            ) : null}
            {property.fuelTypes.length ? (
              <Text className="text-small text-muted font-medium bg-surface-muted rounded-full px-2 py-0.5">
                {displayFuelTypes(property.fuelTypes)}
              </Text>
            ) : null}
            {property.tour ? (
              <Text className="text-small text-muted font-medium bg-surface-muted rounded-full px-2 py-0.5">
                Tour {property.tour}
              </Text>
            ) : null}
            {property.sourceSystem === 'genesis' ? (
              <Text className="text-small text-info font-semibold bg-info-soft rounded-full px-2 py-0.5">
                Genesis
              </Text>
            ) : null}
            {property.isActive === false ? (
              <Text className="text-small text-danger font-semibold bg-danger-soft rounded-full px-2 py-0.5">
                Inaktiv
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {/* Action row — visually lighter, clearly subordinate */}
      <View className="border-t border-divider">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rapport starten"
          onPress={onCreateReport}
          className="flex-row items-center gap-1.5 px-3 py-2.5"
          style={({ pressed }) => pressed ? { opacity: 0.6 } : undefined}
        >
          <FilePlus2 color={colors.primary} size={14} strokeWidth={2} />
          <Text className="text-small font-semibold text-primary">
            Rapport starten
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
