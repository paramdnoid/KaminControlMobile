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
  getGenesisContext,
  getProperty,
  listReports,
} from '../../src/data/database';
import {
  displayAddressRole,
  displayBuildingType,
  displayFuelTypes,
} from '../../src/data/options';
import { colors, spacing, typography } from '../../src/theme/theme';
import type { CustomerProperty, GenesisPropertyContext, ReportBundle } from '../../src/types';
import { joinAddress } from '../../src/utils/text';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<CustomerProperty | null>(null);
  const [genesisContext, setGenesisContext] = useState<GenesisPropertyContext | null>(null);
  const [reports, setReports] = useState<ReportBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    const [nextProperty, allReports, nextGenesisContext] = await Promise.all([
      getProperty(id),
      listReports(),
      getGenesisContext(id),
    ]);
    setProperty(nextProperty);
    setGenesisContext(nextGenesisContext);
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
        <Info label="Quelle" value={property.sourceSystem === 'genesis' ? `Genesis ${property.sourceKey || ''}` : 'Manuell'} />
        <Info label="Status" value={property.isActive === false ? 'Inaktiv im letzten Genesis-Import' : 'Aktiv'} />
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

      {genesisContext ? (
        <>
          <SectionHeader
            title="Genesis-Kontext"
            meta={genesisContext.importRun ? `Import ${new Date(genesisContext.importRun.importedAt).toLocaleDateString('de-CH')}` : undefined}
          />
          <Card>
            <Info label="Anlagen" value={`${genesisContext.installations.length}`} />
            <Info label="Tarifvorschläge" value={`${genesisContext.tariffSuggestions.length}`} />
            <Info label="Arbeitsvolumen" value={`${genesisContext.arbvolSummary.length}`} />
            <Info label="Historie" value={`${genesisContext.history.length}`} />
          </Card>

          {genesisContext.installations.length ? (
            <>
              <SectionHeader title="Anlagen" />
              <View style={styles.list}>
                {genesisContext.installations.map((installation) => (
                  <Card key={installation.id} compact>
                    <Text style={styles.itemTitle}>{installation.label || installation.systemCode || 'Anlage'}</Text>
                    <Text style={styles.meta}>
                      {[installation.fuelTypes.join(', '), installation.kwh && `${installation.kwh} kW`, installation.buildYear && `Baujahr ${installation.buildYear}`]
                        .filter(Boolean)
                        .join(' · ') || '-'}
                    </Text>
                    <Text style={styles.text}>
                      {[installation.manufacturer, installation.model, installation.location].filter(Boolean).join(', ') || installation.notes || '-'}
                    </Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {genesisContext.tariffSuggestions.length ? (
            <>
              <SectionHeader title="Tarifvorschläge" />
              <View style={styles.list}>
                {genesisContext.tariffSuggestions.slice(0, 8).map((work) => (
                  <Card key={work.id} compact>
                    <Text style={styles.itemTitle}>{work.description || work.tp || 'Geplante Arbeit'}</Text>
                    <Text style={styles.meta}>
                      {[work.tariffCode, work.quantity && `Anzahl ${work.quantity}`, work.tp && `${work.tp} TP`, work.amount && `CHF ${work.amount}`]
                        .filter(Boolean)
                        .join(' · ') || '-'}
                    </Text>
                    <Text style={styles.text}>{work.reason || work.notes || '-'}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {genesisContext.arbvolSummary.length ? (
            <>
              <SectionHeader title="Arbeitsvolumen" />
              <View style={styles.list}>
                {genesisContext.arbvolSummary.map((work) => (
                  <Card key={work.id} compact>
                    <Text style={styles.itemTitle}>{work.description || 'Arbeitsvolumen'}</Text>
                    <Text style={styles.meta}>
                      {[work.month, work.tour && `Tour ${work.tour}`, work.minutes && `${work.minutes} Min.`]
                        .filter(Boolean)
                        .join(' · ') || '-'}
                    </Text>
                    {work.notes ? <Text style={styles.text}>{work.notes}</Text> : null}
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {genesisContext.history.length ? (
            <>
              <SectionHeader title="Historie" meta="Read-only aus Genesis" />
              <View style={styles.list}>
                {genesisContext.history.slice(0, 8).map((entry) => (
                  <Card key={entry.id} compact>
                    <Text style={styles.itemTitle}>{entry.date || 'Ohne Datum'}</Text>
                    <Text style={styles.meta}>
                      {[entry.employee, entry.amount && `CHF ${entry.amount}`].filter(Boolean).join(' · ') || '-'}
                    </Text>
                    <Text style={styles.text}>{entry.description || entry.notes || '-'}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}

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
    lineHeight: 23,
  },
  list: {
    gap: spacing.md,
  },
  itemTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
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
