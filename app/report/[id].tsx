import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileJson2,
  FileText,
  Plus,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react-native';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Field } from '../../src/components/Field';
import { Screen } from '../../src/components/Screen';
import { SectionHeader } from '../../src/components/SectionHeader';
import {
  completeReport,
  getGenesisContext,
  getReportBundle,
  markReportExported,
  saveReport,
} from '../../src/data/database';
import {
  buildStructuredReport,
  shareReportPdf,
} from '../../src/pdf/reportPdf';
import { colors, spacing, typography } from '../../src/theme/theme';
import type { GenesisHistoryEntry, GenesisPlannedWork, GenesisPropertyContext, ReportBundle, ServiceReport, WorkItem } from '../../src/types';
import { createId } from '../../src/utils/id';
import { joinAddress } from '../../src/utils/text';

type FormErrors = {
  cleaningDate?: string;
  chimneySweepName?: string;
};

type SuggestionTab = 'objectTariff' | 'invoiceLine' | 'history' | 'arbvol';

function emptyWorkItem(reportId: string, sortOrder: number): WorkItem {
  return {
    id: createId('item'),
    reportId,
    quantity: '',
    description: '',
    tp: '',
    amount: '',
    minutes: '',
    sortOrder,
  };
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [genesisContext, setGenesisContext] = useState<GenesisPropertyContext | null>(null);
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showJson, setShowJson] = useState(false);
  const [suggestionTab, setSuggestionTab] = useState<SuggestionTab>('objectTariff');
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  // isDirty tracks whether the user has made changes since last load/save.
  // Using state (not a ref) ensures the autosave effect observes the correct value
  // even under React's concurrent scheduler.
  const [isDirty, setIsDirty] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    const nextBundle = await getReportBundle(id);
    const nextGenesisContext = nextBundle ? await getGenesisContext(nextBundle.property.id) : null;
    setBundle(nextBundle);
    setGenesisContext(nextGenesisContext);
    setReport(nextBundle?.report ?? null);
    setWorkItems(
      nextBundle?.workItems.length
        ? nextBundle.workItems
        : nextBundle?.report
          ? [emptyWorkItem(nextBundle.report.id, 0)]
          : [],
    );
    // Reset dirty flag after load — prevents autosave firing on re-focus with no changes
    setIsDirty(false);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!isDirty || !report) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      saveReport(report, workItems)
        .then(() => setSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })))
        .catch((error) => {
          console.warn('Autosave failed', error);
        });
    }, 700);

    return () => clearTimeout(timeout);
  }, [report, workItems, isDirty]);

  // ISO date string for today — used as the date field placeholder; stable per mount
  const todayPlaceholder = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute once per render cycle; used by structuredJson, suggestion checks, and JSX meta
  const cleanItems = useMemo(() => cleanWorkItems(workItems), [workItems]);

  // Set of work item signatures for O(1) "already applied" checks across up to 16 suggestion rows
  const cleanSignatures = useMemo(
    () => new Set(cleanItems.map(workItemSignature)),
    [cleanItems],
  );

  const structuredJson = useMemo(() => {
    if (!bundle || !report) {
      return '';
    }
    return buildStructuredReport({ ...bundle, report, workItems: cleanItems });
  }, [bundle, report, cleanItems]);

  function updateReport(patch: Partial<ServiceReport>) {
    setIsDirty(true);
    setReport((current) => (current ? { ...current, ...patch } : current));
  }

  function updateWorkItem(index: number, patch: Partial<WorkItem>) {
    setIsDirty(true);
    setWorkItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function removeWorkItem(index: number) {
    setIsDirty(true);
    setWorkItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addWorkItem() {
    if (!report) {
      return;
    }
    setIsDirty(true);
    const item = emptyWorkItem(report.id, workItems.length);
    setExpandedItemIds((current) => [...current, item.id]);
    setWorkItems((current) => [...current, item]);
  }

  function appendSuggestedItems(items: WorkItem[]) {
    if (!items.length) {
      return;
    }

    setWorkItems((current) => {
      const existingSignatures = new Set(cleanWorkItems(current).map(workItemSignature));
      const newItems = items.filter((item) => !existingSignatures.has(workItemSignature(item)));
      if (!newItems.length) {
        return current;
      }
      const currentHasContent = cleanWorkItems(current).length > 0;
      const nextItems = currentHasContent ? [...current, ...newItems] : newItems;
      return nextItems.map((item, index) => ({ ...item, sortOrder: index }));
    });
  }

  function applyTariffSuggestion(work: GenesisPlannedWork) {
    if (!report || work.lineType === 'control') {
      return;
    }
    appendSuggestedItems([workFromPlannedSuggestion(report.id, work)]);
  }

  function applyAllTariffs() {
    if (!report || !genesisContext?.objectTariffSuggestions.length) {
      return;
    }
    appendSuggestedItems(genesisContext.objectTariffSuggestions
      .filter((work) => work.lineType !== 'control')
      .map((work) => workFromPlannedSuggestion(report.id, work)));
  }

  function applyInvoiceLineSuggestion(work: GenesisPlannedWork) {
    if (!report || work.lineType === 'control') {
      return;
    }
    appendSuggestedItems([workFromPlannedSuggestion(report.id, work)]);
  }

  function applyArbvolSuggestion(work: GenesisPlannedWork) {
    if (!report) {
      return;
    }
    appendSuggestedItems([workFromPlannedSuggestion(report.id, work)]);
  }

  function applyHistorySuggestion(entry: GenesisHistoryEntry) {
    if (!report) {
      return;
    }
    appendSuggestedItems([workFromHistory(report.id, entry)]);
  }

  function isSuggestedWorkApplied(work: GenesisPlannedWork): boolean {
    return cleanSignatures.has(workItemSignature(workFromPlannedSuggestion(report?.id ?? '', work)));
  }

  function isHistoryApplied(entry: GenesisHistoryEntry): boolean {
    return cleanSignatures.has(workItemSignature(workFromHistory(report?.id ?? '', entry)));
  }

  function toggleItem(id: string) {
    setExpandedItemIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!report?.cleaningDate) {
      nextErrors.cleaningDate = 'Datum ist erforderlich.';
    }
    if (!report?.chimneySweepName.trim()) {
      nextErrors.chimneySweepName = 'Name des Kaminfegers ist erforderlich.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function finishReport() {
    if (!report || !validate()) {
      return;
    }

    setBusy(true);
    try {
      await completeReport(report, cleanWorkItems(workItems));
      await load();
    } catch (error) {
      Alert.alert('Abschluss fehlgeschlagen', error instanceof Error ? error.message : 'Rapport konnte nicht abgeschlossen werden.');
    } finally {
      setBusy(false);
    }
  }

  async function sharePdf() {
    if (!bundle || !report) {
      return;
    }

    setBusy(true);
    try {
      await saveReport(report, cleanWorkItems(workItems));
      await shareReportPdf({ ...bundle, report, workItems: cleanWorkItems(workItems) });
    } catch (error) {
      Alert.alert('PDF fehlgeschlagen', error instanceof Error ? error.message : 'PDF konnte nicht erzeugt werden.');
    } finally {
      setBusy(false);
    }
  }

  async function exportDone() {
    if (!report) {
      return;
    }

    setBusy(true);
    try {
      await markReportExported(report.id);
      await load();
    } catch (error) {
      Alert.alert('Status fehlgeschlagen', error instanceof Error ? error.message : 'Status konnte nicht gesetzt werden.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Rapport">
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!bundle || !report) {
    return (
      <Screen title="Rapport">
        <Card>
          <Text style={styles.title}>Nicht gefunden</Text>
          <Button label="Zurück" onPress={() => router.back()} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  const property = bundle.property;
  const isCompleted = report.status === 'completed' || report.status === 'exported';
  const objectTariffSuggestions = genesisContext?.objectTariffSuggestions ?? [];
  // isSuggestedWorkApplied is O(1) via cleanSignatures Set, so no separate memo needed
  const applicableTariffs = objectTariffSuggestions.filter((work) => work.lineType !== 'control');
  const allTariffSuggestionsApplied =
    applicableTariffs.length > 0 && applicableTariffs.every((work) => isSuggestedWorkApplied(work));

  return (
    <Screen
      title={isCompleted ? 'Rapport' : 'Rapport erfassen'}
      subtitle={savedAt ? `Automatisch gespeichert ${savedAt}` : 'Lokaler Entwurf'}
      footer={
        isCompleted ? (
          <View style={styles.footerActions}>
            <Button label="PDF teilen" icon={Share2} loading={busy} onPress={sharePdf} variant="primary" />
            {report.status !== 'exported' ? (
              <Button label="Als exportiert markieren" icon={CheckCircle2} onPress={exportDone} variant="secondary" />
            ) : null}
          </View>
        ) : (
          <Button label="Rapport abschliessen" icon={CheckCircle2} loading={busy} onPress={finishReport} variant="primary" />
        )
      }
    >
      <Card>
        <View style={styles.statusLine}>
          <Text style={styles.status}>{statusLabel(report.status)}</Text>
          <Text style={styles.meta}>{property.customerNumber ? `Kundennummer ${property.customerNumber}` : ''}</Text>
        </View>
        <Text style={styles.title}>{property.propertyLabel || property.street || 'Liegenschaft'}</Text>
        <Text style={styles.meta}>{joinAddress(property.street, property.postalCode, property.city)}</Text>
      </Card>

      <SectionHeader title="Termin" />
      {isCompleted ? (
        <Card>
          <ReadRow label="Datum Reinigung" value={report.cleaningDate} />
          <View style={styles.twoCols}>
            <View style={styles.flexField}><ReadRow label="Uhrzeit von" value={report.timeFrom} /></View>
            <View style={styles.flexField}><ReadRow label="bis" value={report.timeTo} /></View>
          </View>
        </Card>
      ) : (
        <Card>
          <Field
            error={errors.cleaningDate}
            label="Datum Reinigung"
            onChangeText={(value) => updateReport({ cleaningDate: value })}
            placeholder={todayPlaceholder}
            value={report.cleaningDate}
          />
          <View style={styles.twoCols}>
            <Field
              containerStyle={styles.flexField}
              label="Uhrzeit von"
              onChangeText={(value) => updateReport({ timeFrom: value })}
              placeholder="08:00"
              value={report.timeFrom}
            />
            <Field
              containerStyle={styles.flexField}
              label="bis"
              onChangeText={(value) => updateReport({ timeTo: value })}
              placeholder="09:30"
              value={report.timeTo}
            />
          </View>
        </Card>
      )}

      <SectionHeader title="Arbeiten vor Ort" meta={`${cleanItems.length} Positionen mit Inhalt`} />
      {!isCompleted && genesisContext ? (
        <Card>
          <View style={styles.suggestionHeader}>
            <View style={styles.doneHeader}>
              <Sparkles color={colors.primary} size={21} />
              <Text style={styles.title}>Intelligente Vorschläge</Text>
            </View>
            {genesisContext.objectTariffSuggestions.some((work) => work.lineType !== 'control') ? (
              <Button
                disabled={allTariffSuggestionsApplied}
                icon={Plus}
                label={allTariffSuggestionsApplied ? 'Tarife übernommen' : 'Alle Tarife übernehmen'}
                onPress={applyAllTariffs}
                variant="secondary"
              />
            ) : null}
          </View>
          <View style={styles.segmented}>
            <SuggestionTabButton
              active={suggestionTab === 'objectTariff'}
              count={genesisContext.objectTariffSuggestions.length}
              label="Objekttarife"
              onPress={() => setSuggestionTab('objectTariff')}
            />
            <SuggestionTabButton
              active={suggestionTab === 'invoiceLine'}
              count={genesisContext.invoiceLineSuggestions.length}
              label="Rechnungen"
              onPress={() => setSuggestionTab('invoiceLine')}
            />
            <SuggestionTabButton
              active={suggestionTab === 'history'}
              count={genesisContext.history.length}
              label="Historie"
              onPress={() => setSuggestionTab('history')}
            />
            <SuggestionTabButton
              active={suggestionTab === 'arbvol'}
              count={genesisContext.arbvolSummary.length}
              label="Arbeitsvolumen"
              onPress={() => setSuggestionTab('arbvol')}
            />
          </View>

          {suggestionTab === 'objectTariff' ? (
            genesisContext.objectTariffSuggestions.length ? (
              <View style={styles.suggestionList}>
                {genesisContext.objectTariffSuggestions.slice(0, 16).map((work) => {
                  const canApply = work.lineType !== 'control';
                  return (
                  <SuggestionRow
                    key={work.id}
                    actionLabel={!canApply ? 'Kontext' : isSuggestedWorkApplied(work) ? 'Übernommen' : '+'}
                    applied={!canApply || isSuggestedWorkApplied(work)}
                    meta={[
                      work.lineType === 'control' && 'Kontrollzeile',
                      work.tariffCode,
                      work.quantity && `Anzahl ${work.quantity}`,
                      work.tp && `${work.tp} TP`,
                      work.amount && `CHF ${work.amount}`,
                      work.minutes && `${work.minutes} Min.`,
                    ].filter(Boolean).join(' · ')}
                    onPress={() => applyTariffSuggestion(work)}
                    subtitle={work.reason || work.notes}
                    title={work.description || 'Tarifposition'}
                  />
                  );
                })}
              </View>
            ) : (
              <Text style={styles.meta}>Keine Objekttarife für diese Liegenschaft vorhanden.</Text>
            )
          ) : null}

          {suggestionTab === 'invoiceLine' ? (
            genesisContext.invoiceLineSuggestions.length ? (
              <View style={styles.suggestionList}>
                {genesisContext.invoiceLineSuggestions.slice(0, 16).map((work) => {
                  const canApply = work.lineType !== 'control';
                  return (
                    <SuggestionRow
                      key={work.id}
                      actionLabel={!canApply ? 'Kontext' : isSuggestedWorkApplied(work) ? 'Übernommen' : '+'}
                      applied={!canApply || isSuggestedWorkApplied(work)}
                      meta={[
                        work.invoiceNumber && `Rechnung ${work.invoiceNumber}`,
                        work.position && `Pos. ${work.position}`,
                        work.lineType === 'control' && 'Kontrollzeile',
                        work.tariffCode,
                        work.quantity && `Anzahl ${work.quantity}`,
                        work.amount && `CHF ${work.amount}`,
                        work.unitPrice && `à ${work.unitPrice}`,
                      ].filter(Boolean).join(' · ')}
                      onPress={() => applyInvoiceLineSuggestion(work)}
                      subtitle={work.reason || work.notes}
                      title={work.description || 'Rechnungsposition'}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={styles.meta}>Keine Rechnungspositionen als Vorlage vorhanden.</Text>
            )
          ) : null}

          {suggestionTab === 'history' ? (
            genesisContext.history.length ? (
              <View style={styles.suggestionList}>
                {genesisContext.history.slice(0, 8).map((entry) => (
                  <SuggestionRow
                    key={entry.id}
                    actionLabel={isHistoryApplied(entry) ? 'Übernommen' : '+'}
                    applied={isHistoryApplied(entry)}
                    meta={[entry.date, entry.employee, entry.amount && `CHF ${entry.amount}`].filter(Boolean).join(' · ')}
                    onPress={() => applyHistorySuggestion(entry)}
                    subtitle={entry.notes}
                    title={entry.description || 'Historie-Eintrag'}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.meta}>Keine Historie aus Genesis vorhanden.</Text>
            )
          ) : null}

          {suggestionTab === 'arbvol' ? (
            genesisContext.arbvolSummary.length ? (
              <View style={styles.suggestionList}>
                {genesisContext.arbvolSummary.map((work) => (
                  <SuggestionRow
                    key={work.id}
                    actionLabel={isSuggestedWorkApplied(work) ? 'Übernommen' : '+'}
                    applied={isSuggestedWorkApplied(work)}
                    meta={[work.month, work.tour && `Tour ${work.tour}`, work.minutes && `${work.minutes} Min.`].filter(Boolean).join(' · ')}
                    onPress={() => applyArbvolSuggestion(work)}
                    subtitle={work.notes}
                    title={work.description || 'Arbeitsvolumen'}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.meta}>Kein Arbeitsvolumen für diese Liegenschaft vorhanden.</Text>
            )
          ) : null}
        </Card>
      ) : null}
      {isCompleted ? (
        <View style={styles.list}>
          {cleanItems.length ? cleanItems.map((item, index) => (
            <Card key={item.id} compact>
              <Text style={styles.itemTitle}>{item.description || `Position ${index + 1}`}</Text>
              <Text style={styles.meta}>
                {[
                  item.quantity && `Anzahl ${item.quantity}`,
                  item.tp && `${item.tp} TP`,
                  item.amount && `CHF ${item.amount}`,
                  item.minutes && `${item.minutes} Min.`,
                ].filter(Boolean).join(' · ') || '-'}
              </Text>
            </Card>
          )) : (
            <Card compact><Text style={styles.meta}>Keine Positionen erfasst.</Text></Card>
          )}
        </View>
      ) : (
        <>
          <View style={styles.list}>
            {workItems.map((item, index) => (
              <Card key={item.id}>
                <View style={styles.compactItemHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Position ${index + 1} bearbeiten`}
                    onPress={() => toggleItem(item.id)}
                    style={styles.itemSummary}
                  >
                    {expandedItemIds.includes(item.id) || !item.description.trim() ? (
                      <ChevronDown color={colors.muted} size={20} />
                    ) : (
                      <ChevronRight color={colors.muted} size={20} />
                    )}
                    <View style={styles.summaryText}>
                      <Text style={styles.itemTitle}>{item.description || `Position ${index + 1}`}</Text>
                      <Text style={styles.meta}>
                        {[item.quantity && `Anzahl ${item.quantity}`, item.tp && `${item.tp} TP`, item.amount && `CHF ${item.amount}`, item.minutes && `${item.minutes} Min.`]
                          .filter(Boolean)
                          .join(' · ') || 'Zum Bearbeiten öffnen'}
                      </Text>
                    </View>
                  </Pressable>
                  {workItems.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Position ${index + 1} löschen`}
                      onPress={() => removeWorkItem(index)}
                      style={styles.iconButton}
                    >
                      <Trash2 color={colors.danger} size={20} />
                    </Pressable>
                  ) : null}
                </View>
                {expandedItemIds.includes(item.id) || !item.description.trim() ? (
                  <>
                    <Field
                      label="Bezeichnung"
                      onChangeText={(value) => updateWorkItem(index, { description: value })}
                      placeholder="Ausgeführte Arbeit"
                      value={item.description}
                    />
                    <View style={styles.twoCols}>
                      <Field
                        containerStyle={styles.flexField}
                        keyboardType="decimal-pad"
                        label="Anzahl"
                        onChangeText={(value) => updateWorkItem(index, { quantity: value })}
                        value={item.quantity}
                      />
                      <Field
                        containerStyle={styles.flexField}
                        keyboardType="decimal-pad"
                        label="Min."
                        onChangeText={(value) => updateWorkItem(index, { minutes: value })}
                        value={item.minutes}
                      />
                    </View>
                    <View style={styles.twoCols}>
                      <Field
                        containerStyle={styles.flexField}
                        label="TP"
                        onChangeText={(value) => updateWorkItem(index, { tp: value })}
                        value={item.tp}
                      />
                      <Field
                        containerStyle={styles.flexField}
                        keyboardType="decimal-pad"
                        label="Betrag"
                        onChangeText={(value) => updateWorkItem(index, { amount: value })}
                        value={item.amount}
                      />
                    </View>
                  </>
                ) : null}
              </Card>
            ))}
          </View>
          <Button label="Position hinzufügen" icon={Plus} onPress={addWorkItem} variant="secondary" />
        </>
      )}

      <SectionHeader title="Bemerkungen" />
      {isCompleted ? (
        <Card>
          {report.notes ? <ReadRow label="Bemerkungen" value={report.notes} /> : null}
          <ReadRow label="Kaminfeger" value={report.chimneySweepName} />
        </Card>
      ) : (
        <Card>
          <Field
            label="Bemerkungen"
            multiline
            numberOfLines={4}
            onChangeText={(value) => updateReport({ notes: value })}
            style={styles.textArea}
            textAlignVertical="top"
            value={report.notes}
          />
          <Field
            error={errors.chimneySweepName}
            label="Name Kaminfeger"
            onChangeText={(value) => updateReport({ chimneySweepName: value })}
            value={report.chimneySweepName}
          />
        </Card>
      )}

      {isCompleted ? (
        <Card>
          <View style={styles.doneHeader}>
            <FileText color={colors.primary} size={22} />
            <Text style={styles.title}>Übergabe ans Büro</Text>
          </View>
          <Button label="PDF teilen" icon={Share2} loading={busy} onPress={sharePdf} variant="primary" />
          <Button
            label={showJson ? 'Strukturierte Daten ausblenden' : 'Strukturierte Daten anzeigen'}
            icon={FileJson2}
            onPress={() => setShowJson((current) => !current)}
            variant="ghost"
          />
          {showJson ? (
            <Text selectable style={styles.json}>{structuredJson}</Text>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readRow}>
      <Text style={styles.readLabel}>{label}</Text>
      <Text style={styles.readValue}>{value || '-'}</Text>
    </View>
  );
}

function SuggestionTabButton({
  active,
  count,
  label,
  onPress,
}: {
  active: boolean;
  count: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} Vorschläge anzeigen`}
      onPress={onPress}
      style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
    >
      <Text numberOfLines={2} style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.segmentCount, active ? styles.segmentLabelActive : null]}>{count}</Text>
    </Pressable>
  );
}

function SuggestionRow({
  actionLabel,
  applied,
  meta,
  onPress,
  subtitle,
  title,
}: {
  actionLabel: string;
  applied: boolean;
  meta: string;
  onPress: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.suggestionRow}>
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionTitle}>{title}</Text>
        <Text style={styles.meta}>{meta || '-'}</Text>
        {subtitle ? <Text style={styles.suggestionReason}>{subtitle}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={applied ? 'Vorschlag wurde bereits übernommen' : 'Vorschlag übernehmen'}
        disabled={applied}
        onPress={onPress}
        style={[styles.suggestionAction, applied ? styles.suggestionActionApplied : null]}
      >
        <Text numberOfLines={1} style={[styles.suggestionActionText, applied ? styles.suggestionActionTextApplied : null]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function cleanWorkItems(items: WorkItem[]): WorkItem[] {
  return items
    .filter((item) =>
      [item.quantity, item.description, item.tp, item.amount, item.minutes].some((value) => value.trim()),
    )
    .map((item, index) => ({ ...item, sortOrder: index }));
}

function workFromPlannedSuggestion(reportId: string, work: GenesisPlannedWork): WorkItem {
  return {
    id: createId('item'),
    reportId,
    quantity: work.quantity,
    description: work.description || work.notes || 'Genesis-Vorschlag',
    tp: work.tp,
    amount: work.amount,
    minutes: work.minutes,
    sortOrder: 0,
  };
}

function workFromHistory(reportId: string, entry: GenesisHistoryEntry): WorkItem {
  return {
    id: createId('item'),
    reportId,
    quantity: '',
    description: entry.description || entry.notes || 'Historie-Vorschlag',
    tp: '',
    amount: '',
    minutes: entry.minutes,
    sortOrder: 0,
  };
}

function workItemSignature(item: Pick<WorkItem, 'quantity' | 'description' | 'tp' | 'amount' | 'minutes'>): string {
  return [item.quantity, item.description, item.tp, item.amount, item.minutes]
    .map((value) => value.trim().toLowerCase())
    .join('|');
}

function statusLabel(status: ServiceReport['status']): string {
  if (status === 'exported') {
    return 'Exportiert';
  }
  if (status === 'completed') {
    return 'Abgeschlossen';
  }
  return 'Entwurf';
}

const styles = StyleSheet.create({
  footerActions: {
    gap: spacing.md,
  },
  statusLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  status: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
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
  twoCols: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexField: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  suggestionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  segmented: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  segmentLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentLabelActive: {
    color: colors.primary,
  },
  segmentCount: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '900',
  },
  suggestionList: {
    gap: spacing.sm,
  },
  suggestionRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  suggestionText: {
    flex: 1,
    gap: spacing.xs,
  },
  suggestionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    lineHeight: 22,
  },
  suggestionReason: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  suggestionAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
  },
  suggestionActionApplied: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    minWidth: 96,
  },
  suggestionActionText: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: '900',
  },
  suggestionActionTextApplied: {
    color: colors.primary,
  },
  compactItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  itemSummary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
  },
  summaryText: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    lineHeight: 22,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  textArea: {
    minHeight: 112,
  },
  doneHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  json: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 17,
    padding: spacing.md,
  },
  readRow: {
    gap: spacing.xs,
  },
  readLabel: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  readValue: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 23,
  },
});
