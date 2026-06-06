import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';
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
import { colors } from '../../src/theme/theme';
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
    if (!id) return;
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function startReport() {
    if (!property) return;
    setCreating(true);
    try {
      const report = await createReport(property.id);
      router.push({ pathname: '/report/[id]', params: { id: report.id } });
    } finally { setCreating(false); }
  }

  async function openPdf(localUri: string) {
    if (!localUri) {
      Alert.alert('PDF nicht lokal verfügbar', 'Dieses Dokument wurde nur als Metadatum importiert.');
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
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!property) {
    return (
      <Screen title="Liegenschaft">
        <Card>
          <Text className="text-h3 font-bold text-ink">Nicht gefunden</Text>
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
        <Button label="Rapport starten" icon={FilePlus2} loading={creating} onPress={startReport} variant="primary" />
      }
    >
      <SectionHeader title="Stammdaten" meta={property.customerNumber ? `Nr. ${property.customerNumber}` : undefined} />
      <Card>
        <Info label="Quelle"              value={property.sourceSystem === 'genesis' ? `Genesis ${property.sourceKey || ''}` : 'Manuell'} />
        <Info label="Status"             value={property.isActive === false ? 'Inaktiv im letzten Genesis-Import' : 'Aktiv'} />
        <Info label="Gebäudeart"         value={displayBuildingType(property.buildingType, property.otherBuildingType)} />
        <Info label="Rechnungsadresse"   value={displayAddressRole(property.billingRole)} />
        <Info label="Avisierungsadr."    value={displayAddressRole(property.notificationRole)} />
      </Card>

      <SectionHeader title="Kontaktrollen" />
      <Card>
        <Info label="Eigentümer" value={property.owner}      multiline />
        <Info label="Mieter"     value={property.tenant}     multiline />
        <Info label="Verwaltung" value={property.management} multiline />
        <Info label="Hauswart"   value={property.caretaker}  multiline />
      </Card>

      <SectionHeader title="Feuerung und Tour" />
      <Card>
        <Info label="Brennstoff"         value={displayFuelTypes(property.fuelTypes)} />
        <Info label="Anlagen"            value={property.fireSystemCodes.join(', ') || '-'} />
        <Info label="Ölheizung Kessel"   value={property.oilBoiler} />
        <Info label="kWh"                value={property.kwh} />
        <Info label="Baujahr"            value={property.buildYear} />
        <Info label="Tour"               value={property.tour} />
        <Info label="Reinigungsmonate"   value={property.cleaningMonths.join(', ') || '-'} />
      </Card>

      {genesisContext ? (
        <>
          <SectionHeader
            title="Genesis-Kontext"
            meta={genesisContext.importRun ? `Import ${new Date(genesisContext.importRun.importedAt).toLocaleDateString('de-CH')}` : undefined}
          />
          <Card>
            <Info label="Anlagen"            value={`${genesisContext.installations.length}`} />
            <Info label="Objekttarife"       value={`${genesisContext.objectTariffSuggestions.length}`} />
            <Info label="Rechnungsvorschl."  value={`${genesisContext.invoiceLineSuggestions.length}`} />
            <Info label="Rechnungen"         value={`${genesisContext.invoices.length}`} />
            <Info label="PDFs"               value={`${genesisContext.pdfDocuments.length}`} />
            <Info label="Arbeitsvolumen"     value={`${genesisContext.arbvolSummary.length}`} />
            <Info label="Historie"           value={`${genesisContext.history.length}`} />
          </Card>

          {genesisContext.installations.length ? (
            <>
              <SectionHeader title="Anlagen" />
              <View className="gap-2">
                {genesisContext.installations.map((inst) => (
                  <Card key={inst.id} compact>
                    <Text className="text-base font-semibold text-ink">{inst.label || inst.systemCode || 'Anlage'}</Text>
                    <Text className="text-small text-muted leading-[18px]">
                      {[inst.fuelTypes.join(', '), inst.kwh && `${inst.kwh} kW`, inst.buildYear && `Baujahr ${inst.buildYear}`].filter(Boolean).join(' · ') || '-'}
                    </Text>
                    <Text className="text-small text-muted leading-[18px]">
                      {[inst.manufacturer, inst.model, inst.location].filter(Boolean).join(', ') || inst.notes || '-'}
                    </Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {genesisContext.invoices.length ? (
            <>
              <SectionHeader title="Rechnungen" />
              <View className="gap-2">
                {genesisContext.invoices.map((invoice) => {
                  const lines     = genesisContext.invoiceLines.filter((l) => l.invoiceNumber === invoice.invoiceNumber);
                  const documents = genesisContext.pdfDocuments.filter((d) => d.invoiceNumber === invoice.invoiceNumber);
                  return (
                    <Card key={invoice.id}>
                      <View className="flex-row items-center gap-3 justify-between">
                        <View className="flex-1 gap-1">
                          <Text className="text-base font-semibold text-ink">Rechnung {invoice.invoiceNumber}</Text>
                          <View className="flex-row items-center flex-wrap gap-2">
                            <View className={`flex-row items-center rounded-full px-2 py-0.5 ${invoiceStatusBg(invoice.status)}`}>
                              <Text className={`text-small font-semibold ${invoiceStatusText(invoice.status)}`}>
                                {invoiceStatusLabel(invoice.status)}
                              </Text>
                            </View>
                            <Text className="text-small text-muted">
                              {[invoice.workDate || invoice.invoiceDate, invoice.totalAmount && `CHF ${invoice.totalAmount}`].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        </View>
                        {documents[0] ? (
                          <Button label="PDF" icon={Share2} onPress={() => openPdf(documents[0].localUri)} variant="secondary" />
                        ) : null}
                      </View>
                      <View className="flex-row flex-wrap gap-3">
                        <Info label="Arbeitsdatum"   value={invoice.workDate} />
                        <Info label="Rechnungsdatum" value={invoice.invoiceDate} />
                        <Info label="Fällig"         value={invoice.dueDate} />
                        <Info label="Bezahlt"        value={invoice.paidDate} />
                        <Info label="Netto"          value={invoice.netAmount ? `CHF ${invoice.netAmount}` : ''} />
                        <Info label="MWST"           value={invoice.vatAmount ? `CHF ${invoice.vatAmount}` : ''} />
                        <Info label="Bezahlt Betrag" value={invoice.paidAmount ? `CHF ${invoice.paidAmount}` : ''} />
                        <Info label="Mahnstufe"      value={invoice.dunningLevel} />
                      </View>
                      <Info label="Rechnungsadresse"          value={invoice.invoiceAddress}  multiline />
                      {invoice.propertyAddress ? <Info label="Liegenschaft auf Rechnung" value={invoice.propertyAddress} multiline /> : null}
                      {lines.length ? (
                        <View className="gap-1">
                          {lines.map((line) => (
                            <View key={line.id} className="bg-surface-muted rounded-md p-3 gap-0.5">
                              <Text className="text-base font-semibold text-ink leading-[22px]">
                                {[line.position && `${line.position}.`, line.description].filter(Boolean).join(' ') || 'Position'}
                              </Text>
                              <Text className="text-small text-muted leading-[18px]">
                                {[line.lineType === 'control' && 'Kontrollzeile', line.tariffCode,
                                  line.quantity && `Anzahl ${line.quantity}`, line.unitPrice && `à CHF ${line.unitPrice}`,
                                  line.amount && `CHF ${line.amount}`].filter(Boolean).join(' · ') || '-'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      {documents.length > 1 ? (
                        <View className="flex-row flex-wrap gap-2">
                          {documents.slice(1).map((doc) => (
                            <Button
                              key={doc.id}
                              label={doc.kind === 'reminder' ? 'Mahnung' : doc.kind === 'paymentReminder' ? 'Zahlungserinnerung' : 'PDF'}
                              icon={FileText}
                              onPress={() => openPdf(doc.localUri)}
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
              <View className="gap-2">
                {genesisContext.objectTariffSuggestions.slice(0, 8).map((work) => (
                  <Card key={work.id} compact>
                    <Text className="text-base font-semibold text-ink">{work.description || work.tp || 'Geplante Arbeit'}</Text>
                    <Text className="text-small text-muted leading-[18px]">
                      {[work.lineType === 'control' && 'Kontrollzeile', work.tariffCode,
                        work.quantity && `Anzahl ${work.quantity}`, work.tp && `${work.tp} TP`,
                        work.amount && `CHF ${work.amount}`].filter(Boolean).join(' · ') || '-'}
                    </Text>
                    <Text className="text-small text-muted leading-[18px]">{work.reason || work.notes || '-'}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {genesisContext.arbvolSummary.length ? (
            <>
              <SectionHeader title="Arbeitsvolumen" />
              <View className="gap-2">
                {genesisContext.arbvolSummary.map((work) => (
                  <Card key={work.id} compact>
                    <Text className="text-base font-semibold text-ink">{work.description || 'Arbeitsvolumen'}</Text>
                    <Text className="text-small text-muted leading-[18px]">
                      {[work.month, work.tour && `Tour ${work.tour}`, work.minutes && `${work.minutes} Min.`].filter(Boolean).join(' · ') || '-'}
                    </Text>
                    {work.notes ? <Text className="text-small text-muted leading-[18px]">{work.notes}</Text> : null}
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {genesisContext.history.length ? (
            <>
              <SectionHeader title="Historie" />
              <View className="gap-2">
                {genesisContext.history.slice(0, 8).map((entry) => (
                  <Card key={entry.id} compact>
                    <Text className="text-base font-semibold text-ink">{entry.date || 'Ohne Datum'}</Text>
                    <Text className="text-small text-muted leading-[18px]">
                      {[entry.employee, entry.amount && `CHF ${entry.amount}`].filter(Boolean).join(' · ') || '-'}
                    </Text>
                    <Text className="text-small text-muted leading-[18px]">{entry.description || entry.notes || '-'}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      <SectionHeader title="Rapporte" meta={`${reports.length} lokal gespeichert`} />
      {reports.length ? (
        <View className="gap-2">
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
          <Text className="text-base text-muted leading-6">Für diese Liegenschaft ist noch kein Rapport vorhanden.</Text>
        </Card>
      )}
    </Screen>
  );
}

function Info({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View className="gap-0.5">
      <Text className="text-xs font-semibold text-muted-light uppercase tracking-wide">{label}</Text>
      <Text className={`text-base font-medium text-ink ${multiline ? 'leading-6' : 'leading-[22px]'}`}>{value || '-'}</Text>
    </View>
  );
}

function invoiceStatusLabel(status: string): string {
  if (status === 'paid')    return 'Bezahlt';
  if (status === 'partial') return 'Teilbezahlt';
  if (status === 'open')    return 'Offen';
  return 'Unbekannt';
}

function invoiceStatusBg(status: string): string {
  if (status === 'paid')    return 'bg-primary-soft';
  if (status === 'partial') return 'bg-accent-soft';
  if (status === 'open')    return 'bg-danger-soft';
  return 'bg-surface-muted';
}

function invoiceStatusText(status: string): string {
  if (status === 'paid')    return 'text-success';
  if (status === 'partial') return 'text-warning';
  if (status === 'open')    return 'text-danger';
  return 'text-muted';
}
