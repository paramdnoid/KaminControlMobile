import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FilePlus2 } from 'lucide-react-native';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ReportCard } from '../../src/components/ReportCard';
import { Screen } from '../../src/components/Screen';
import { SectionHeader } from '../../src/components/SectionHeader';
import {
  createReport,
  getProperty,
  listReports,
} from '../../src/data/database';
import {
  displayAddressRole,
  displayBuildingType,
  displayFuelTypes,
} from '../../src/data/options';
import { colors, spacing, typography } from '../../src/theme/theme';
import type { CustomerProperty, ReportBundle } from '../../src/types';
import { joinAddress } from '../../src/utils/text';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<CustomerProperty | null>(null);
  const [reports, setReports] = useState<ReportBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    const [nextProperty, allReports] = await Promise.all([getProperty(id), listReports()]);
    setProperty(nextProperty);
    setReports(allReports.filter((bundle) => bundle.property.id === id));
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function startReport() {
    if (!property) {
      return;
    }

    setCreating(true);
    try {
      const report = await createReport(property.id);
      router.push({ pathname: '/report/[id]', params: { id: report.id } });
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Liegenschaft">
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!property) {
    return (
      <Screen title="Liegenschaft">
        <Card>
          <Text style={styles.title}>Nicht gefunden</Text>
          <Button label="Zurück" onPress={() => router.back()} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title={property.propertyLabel || property.street || 'Liegenschaft'}
      subtitle={joinAddress(property.street, property.postalCode, property.city)}
      footer={
        <Button
          label="Rapport starten"
          icon={FilePlus2}
          loading={creating}
          onPress={startReport}
          variant="primary"
        />
      }
    >
      <SectionHeader title="Stammdaten" meta={property.customerNumber ? `Kundennummer ${property.customerNumber}` : undefined} />
      <Card>
        <Info label="Gebäudeart" value={displayBuildingType(property.buildingType, property.otherBuildingType)} />
        <Info label="Rechnungsadresse" value={displayAddressRole(property.billingRole)} />
        <Info label="Avisierungsadresse" value={displayAddressRole(property.notificationRole)} />
      </Card>

      <SectionHeader title="Kontaktrollen" />
      <Card>
        <Info label="Eigentümer" value={property.owner} multiline />
        <Info label="Mieter" value={property.tenant} multiline />
        <Info label="Verwaltung" value={property.management} multiline />
        <Info label="Hauswart" value={property.caretaker} multiline />
      </Card>

      <SectionHeader title="Feuerung und Tour" />
      <Card>
        <Info label="Brennstoff" value={displayFuelTypes(property.fuelTypes)} />
        <Info label="Anlagen" value={property.fireSystemCodes.join(', ') || '-'} />
        <Info label="Ölheizung Kessel" value={property.oilBoiler} />
        <Info label="kWh" value={property.kwh} />
        <Info label="Baujahr" value={property.buildYear} />
        <Info label="Tour" value={property.tour} />
        <Info label="Reinigungsmonate" value={property.cleaningMonths.join(', ') || '-'} />
      </Card>

      <SectionHeader title="Rapporte" meta={`${reports.length} lokal gespeichert`} />
      {reports.length ? (
        <View style={styles.list}>
          {reports.map((bundle) => (
            <ReportCard
              key={bundle.report.id}
              bundle={bundle}
              onOpen={() => router.push({ pathname: '/report/[id]', params: { id: bundle.report.id } })}
            />
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.text}>Für diese Liegenschaft ist noch kein Rapport vorhanden.</Text>
        </Card>
      )}
    </Screen>
  );
}

function Info({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, multiline ? styles.multiline : null]}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  text: {
    color: colors.muted,
    fontSize: typography.body,
  },
  list: {
    gap: spacing.md,
  },
  info: {
    gap: spacing.xs,
  },
  label: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  multiline: {
    lineHeight: 23,
  },
});
