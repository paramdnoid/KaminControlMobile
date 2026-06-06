import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FilePlus2, FileText, Share2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';

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
    const [nextProperty, nextReports, nextGenesisContext] = await Promise.all([
      getProperty(id),
      listReports(undefined, id),
      getGenesisContext(id),
    ]);
    setProperty(nextProperty);
    setGenesisContext(nextGenesisContext);
    setReports(nextReports);
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

  async function openPdf(localUri: string) {
    if (!localUri) {
      Alert.alert('PDF nicht lokal verfügbar', 'Dieses Dokument wurde nur als Metadatum importiert. Importiere das Genesis-Transport-ZIP, um PDFs direkt zu öffnen.');
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
      return;
    }
    await Linking.openURL(localUri);
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
            <Info label="Objekttarife" value={`${genesisContext.objectTariffSuggestions.length}`} />
            <Info label="Rechnungsvorschläge" value={`${genesisContext.invoiceLineSuggestions.length}`} />
            <Info label="Rechnungen" value={`${genesisContext.invoices.length}`} />
            <Info label="PDFs" value={`${genesisContext.pdfDocuments.length}`} />
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

          {genesisContext.invoices.length ? (
            <>
              <SectionHeader title="Rechnungen" />
              <View style={styles.list}>
                {genesisContext.invoices.map((invoice) => {
                  const lines = genesisContext.invoiceLines.filter((line) => line.invoiceNumber === invoice.invoiceNumber);
                  const documents = genesisContext.pdfDocuments.filter((document) => document.invoiceNumber === invoice.invoiceNumber);
                  return (
                    <Card key={invoice.id}>
                      <View style={styles.invoiceHeader}>
                        <View style={styles.invoiceTitleBlock}>
                          <Text style={styles.itemTitle}>Rechnung {invoice.invoiceNumber}</Text>
                          <View style={styles.invoiceStatusRow}>
                            <Text style={[styles.statusPill, invoiceStatusStyle(invoice.status)]}>{invoiceStatusLabel(invoice.status)}</Text>
                            <Text style={styles.meta}>
                              {[invoice.workDate || invoice.invoiceDate, invoice.totalAmount && `CHF ${invoice.totalAmount}`]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </View>
                        </View>
                        {documents[0] ? (
                          <Button
                            label="PDF"
                            icon={Share2}
                            onPress={() => openPdf(documents[0].localUri)}
                            variant="secondary"
                          />
                        ) : null}
                      </View>
                      <View style={styles.invoiceGrid}>
                        <Info label="Arbeitsdatum" value={invoice.workDate} />
                        <Info label="Rechnungsdatum" value={invoice.invoiceDate} />
                        <Info label="Fällig" value={invoice.dueDate} />
                        <Info label="Bezahlt" value={invoice.paidDate} />
                        <Info label="Netto" value={invoice.netAmount ? `CHF ${invoice.netAmount}` : ''} />
                        <Info label="MWST" value={invoice.vatAmount ? `CHF ${invoice.vatAmount}` : ''} />
                        <Info label="Bezahlt Betrag" value={invoice.paidAmount ? `CHF ${invoice.paidAmount}` : ''} />
                        <Info label="Mahnstufe" value={invoice.dunningLevel} />
                      </View>
                      <Info label="Rechnungsadresse" value={invoice.invoiceAddress} multiline />
                      {invoice.propertyAddress ? <Info label="Liegenschaft auf Rechnung" value={invoice.propertyAddress} multiline /> : null}
                      {lines.length ? (
                        <View style={styles.invoiceLines}>
                          {lines.map((line) => (
                            <View key={line.id} style={styles.invoiceLine}>
                              <Text style={styles.invoiceLineTitle}>
                                {[line.position && `${line.position}.`, line.description].filter(Boolean).join(' ') || 'Position'}
                              </Text>
                              <Text style={styles.meta}>
                                {[
                                  line.lineType === 'control' && 'Kontrollzeile',
                                  line.tariffCode,
                                  line.quantity && `Anzahl ${line.quantity}`,
                                  line.unitPrice && `à CHF ${line.unitPrice}`,
                                  line.amount && `CHF ${line.amount}`,
                                ].filter(Boolean).join(' · ') || '-'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      {documents.length > 1 ? (
                        <View style={styles.pdfList}>
                          {documents.slice(1).map((document) => (
                            <Button
                              key={document.id}
                              label={document.kind === 'reminder' ? 'Mahnung' : document.kind === 'paymentReminder' ? 'Zahlungserinnerung' : 'PDF'}
                              icon={FileText}
                              onPress={() => openPdf(document.localUri)}
                              variant="ghost"
                            />
                          ))}
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            </>
          ) : null}

          {genesisContext.objectTariffSuggestions.length ? (
            <>
              <SectionHeader title="Objekttarife" />
              <View style={styles.list}>
                {genesisContext.objectTariffSuggestions.slice(0, 8).map((work) => (
                  <Card key={work.id} compact>
                    <Text style={styles.itemTitle}>{work.description || work.tp || 'Geplante Arbeit'}</Text>
                    <Text style={styles.meta}>
                      {[work.lineType === 'control' && 'Kontrollzeile', work.tariffCode, work.quantity && `Anzahl ${work.quantity}`, work.tp && `${work.tp} TP`, work.amount && `CHF ${work.amount}`]
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
              <SectionHeader title="Historie" />
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

function invoiceStatusLabel(status: string): string {
  if (status === 'paid') {
    return 'Bezahlt';
  }
  if (status === 'partial') {
    return 'Teilbezahlt';
  }
  if (status === 'open') {
    return 'Offen';
  }
  return 'Unbekannt';
}

function invoiceStatusStyle(status: string): { backgroundColor: string; color: string } {
  if (status === 'paid') {
    return { backgroundColor: colors.primarySoft, color: colors.success };
  }
  if (status === 'partial') {
    return { backgroundColor: colors.accentSoft, color: colors.warning };
  }
  if (status === 'open') {
    return { backgroundColor: colors.dangerSoft, color: colors.danger };
  }
  return { backgroundColor: colors.surfaceMuted, color: colors.muted };
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
  invoiceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  invoiceTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  invoiceStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusPill: {
    borderRadius: 999,
    fontSize: typography.label,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  invoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  invoiceLines: {
    gap: spacing.sm,
  },
  invoiceLine: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: spacing.md,
  },
  invoiceLineTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    lineHeight: 22,
  },
  pdfList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    gap: spacing.sm,
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
