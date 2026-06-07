import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
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
import { buildStructuredReport, shareReportPdf } from '../../src/pdf/reportPdf';
import { colors } from '../../src/theme/theme';
import type {
  GenesisHistoryEntry,
  GenesisPlannedWork,
  GenesisPropertyContext,
  ReportBundle,
  ServiceReport,
  WorkItem,
} from '../../src/types';
import { createId } from '../../src/utils/id';
import { joinAddress } from '../../src/utils/text';

type FormErrors = { cleaningDate?: string; chimneySweepName?: string };
type SuggestionTab = 'objectTariff' | 'invoiceLine' | 'history' | 'arbvol';

function emptyWorkItem(reportId: string, sortOrder: number): WorkItem {
  return { id: createId('item'), reportId, quantity: '', description: '', tp: '', amount: '', minutes: '', sortOrder };
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bundle, setBundle]                     = useState<ReportBundle | null>(null);
  const [genesisContext, setGenesisContext]     = useState<GenesisPropertyContext | null>(null);
  const [report, setReport]                     = useState<ServiceReport | null>(null);
  const [workItems, setWorkItems]               = useState<WorkItem[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [busy, setBusy]                         = useState(false);
  const [savedAt, setSavedAt]                   = useState<string | null>(null);
  const [errors, setErrors]                     = useState<FormErrors>({});
  const [showJson, setShowJson]                 = useState(false);
  const [suggestionTab, setSuggestionTab]       = useState<SuggestionTab>('objectTariff');
  const [expandedItemIds, setExpandedItemIds]   = useState<string[]>([]);
  const [isDirty, setIsDirty]                   = useState(false);
  const [saveError, setSaveError]               = useState<string | null>(null);
  const [loadError, setLoadError]               = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const nextBundle        = await getReportBundle(id);
      const nextGenesisContext = nextBundle ? await getGenesisContext(nextBundle.property.id) : null;
      setBundle(nextBundle);
      setGenesisContext(nextGenesisContext);
      setReport(nextBundle?.report ?? null);
      setWorkItems(
        nextBundle?.workItems.length
          ? nextBundle.workItems
          : nextBundle?.report ? [emptyWorkItem(nextBundle.report.id, 0)] : [],
      );
      setIsDirty(false);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Rapport konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    // Only drafts autosave — never let a debounced write demote a completed/exported report.
    if (!isDirty || !report || report.status !== 'draft') return undefined;
    const timeout = setTimeout(() => {
      saveReport(report, workItems)
        .then(() => {
          setSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }));
          setSaveError(null);
        })
        .catch((e) => setSaveError(e instanceof Error ? e.message : 'Automatisches Speichern fehlgeschlagen.'));
    }, 700);
    return () => clearTimeout(timeout);
  }, [report, workItems, isDirty]);

  const todayPlaceholder = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const cleanItems       = useMemo(() => cleanWorkItems(workItems), [workItems]);
  const cleanSignatures  = useMemo(() => new Set(cleanItems.map(workItemSignature)), [cleanItems]);
  const structuredJson   = useMemo(() => {
    if (!bundle || !report) return '';
    return buildStructuredReport({ ...bundle, report, workItems: cleanItems });
  }, [bundle, report, cleanItems]);

  function updateReport(patch: Partial<ServiceReport>) {
    setIsDirty(true);
    setReport((c) => (c ? { ...c, ...patch } : c));
  }
  function updateWorkItem(index: number, patch: Partial<WorkItem>) {
    setIsDirty(true);
    setWorkItems((c) => c.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function removeWorkItem(index: number) {
    setIsDirty(true);
    setWorkItems((c) => c.filter((_, i) => i !== index));
  }
  function addWorkItem() {
    if (!report) return;
    setIsDirty(true);
    const item = emptyWorkItem(report.id, workItems.length);
    setExpandedItemIds((c) => [...c, item.id]);
    setWorkItems((c) => [...c, item]);
  }
  function appendSuggestedItems(items: WorkItem[]) {
    if (!items.length) return;
    setWorkItems((current) => {
      const existing = new Set(cleanWorkItems(current).map(workItemSignature));
      const newItems = items.filter((item) => !existing.has(workItemSignature(item)));
      if (!newItems.length) return current;
      const hasContent = cleanWorkItems(current).length > 0;
      return (hasContent ? [...current, ...newItems] : newItems).map((item, i) => ({ ...item, sortOrder: i }));
    });
    setIsDirty(true);
  }
  function applyTariffSuggestion(work: GenesisPlannedWork)   { if (!report || work.lineType === 'control') return; appendSuggestedItems([workFromPlannedSuggestion(report.id, work)]); }
  function applyAllTariffs() {
    if (!report || !genesisContext?.objectTariffSuggestions.length) return;
    appendSuggestedItems(genesisContext.objectTariffSuggestions.filter((w) => w.lineType !== 'control').map((w) => workFromPlannedSuggestion(report.id, w)));
  }
  function applyInvoiceLineSuggestion(work: GenesisPlannedWork) { if (!report || work.lineType === 'control') return; appendSuggestedItems([workFromPlannedSuggestion(report.id, work)]); }
  function applyArbvolSuggestion(work: GenesisPlannedWork)      { if (!report) return; appendSuggestedItems([workFromPlannedSuggestion(report.id, work)]); }
  function applyHistorySuggestion(entry: GenesisHistoryEntry)   { if (!report) return; appendSuggestedItems([workFromHistory(report.id, entry)]); }

  function isSuggestedWorkApplied(work: GenesisPlannedWork) { return cleanSignatures.has(workItemSignature(workFromPlannedSuggestion(report?.id ?? '', work))); }
  function isHistoryApplied(entry: GenesisHistoryEntry)     { return cleanSignatures.has(workItemSignature(workFromHistory(report?.id ?? '', entry))); }

  function toggleItem(itemId: string) {
    setExpandedItemIds((c) => c.includes(itemId) ? c.filter((x) => x !== itemId) : [...c, itemId]);
  }
  function validate(): boolean {
    const next: FormErrors = {};
    if (!report?.cleaningDate)           next.cleaningDate    = 'Datum ist erforderlich.';
    if (!report?.chimneySweepName.trim()) next.chimneySweepName = 'Name des Kaminfegers ist erforderlich.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  async function finishReport() {
    if (!report || !validate()) return;
    setBusy(true);
    try   { await completeReport(report, cleanWorkItems(workItems)); await load(); }
    catch (e) { Alert.alert('Abschluss fehlgeschlagen', e instanceof Error ? e.message : 'Rapport konnte nicht abgeschlossen werden.'); }
    finally   { setBusy(false); }
  }
  async function sharePdf() {
    if (!bundle || !report) return;
    setBusy(true);
    try {
      const clean = cleanWorkItems(workItems);
      await saveReport(report, clean);
      const outcome = await shareReportPdf({ ...bundle, report, workItems: clean });
      if (outcome.method === 'saved') {
        Alert.alert('Teilen nicht verfügbar', 'Das PDF wurde erstellt, konnte aber auf diesem Gerät nicht geteilt werden.');
        return;
      }
      // Share/print succeeded → advance status to exported (no-op if already exported).
      if (report.status !== 'exported') {
        await markReportExported(report.id);
        await load();
      }
    } catch (e) {
      Alert.alert('PDF fehlgeschlagen', e instanceof Error ? e.message : 'PDF konnte nicht erzeugt werden.');
    } finally {
      setBusy(false);
    }
  }
  async function exportDone() {
    if (!report) return;
    setBusy(true);
    try   { await markReportExported(report.id); await load(); }
    catch (e) { Alert.alert('Status fehlgeschlagen', e instanceof Error ? e.message : 'Status konnte nicht gesetzt werden.'); }
    finally   { setBusy(false); }
  }

  if (loading) {
    return (
      <Screen title="Rapport">
        <View className="items-center py-6"><ActivityIndicator color={colors.primary} /></View>
      </Screen>
    );
  }
  if (loadError) {
    return (
      <Screen title="Rapport">
        <Card>
          <Text className="text-h3 font-bold text-ink">Laden fehlgeschlagen</Text>
          <Text className="text-small text-muted">{loadError}</Text>
          <Button label="Erneut versuchen" onPress={() => load()} variant="primary" />
          <Button label="Zurück" onPress={() => router.back()} variant="secondary" />
        </Card>
      </Screen>
    );
  }
  if (!bundle || !report) {
    return (
      <Screen title="Rapport">
        <Card>
          <Text className="text-h3 font-bold text-ink">Nicht gefunden</Text>
          <Button label="Zurück" onPress={() => router.back()} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  const property              = bundle.property;
  const isCompleted           = report.status === 'completed' || report.status === 'exported';
  const objectTariffSuggestions = genesisContext?.objectTariffSuggestions ?? [];
  const applicableTariffs     = objectTariffSuggestions.filter((w) => w.lineType !== 'control');
  const allTariffApplied      = applicableTariffs.length > 0 && applicableTariffs.every((w) => isSuggestedWorkApplied(w));

  return (
    <Screen
      title={isCompleted ? 'Rapport' : 'Rapport erfassen'}
      subtitle={savedAt ? `Automatisch gespeichert ${savedAt}` : 'Lokaler Entwurf'}
      footer={
        isCompleted ? (
          <View className="gap-2">
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
      {/* Autosave error banner */}
      {saveError ? (
        <View className="flex-row items-center gap-2 bg-danger-soft rounded-lg px-3 py-2.5">
          <Text className="text-small text-danger font-medium flex-1">
            {saveError} Bitte erneut bearbeiten, um zu speichern.
          </Text>
        </View>
      ) : null}

      {/* Property identity card */}
      <Card>
        <View className="flex-row items-center justify-between gap-2">
          <View className={`flex-row items-center rounded-full px-2 py-0.5 ${statusBadge(report.status).bg}`}>
            <Text className={`text-small font-semibold ${statusBadge(report.status).text}`}>{statusLabel(report.status)}</Text>
          </View>
          <Text className="text-small text-muted">{property.customerNumber ? `Nr. ${property.customerNumber}` : ''}</Text>
        </View>
        <Text className="text-h3 font-bold text-ink leading-[22px]">{property.propertyLabel || property.street || 'Liegenschaft'}</Text>
        <Text className="text-small text-muted leading-[18px]">{joinAddress(property.street, property.postalCode, property.city)}</Text>
      </Card>

      {/* Termin */}
      <SectionHeader title="Termin" />
      {isCompleted ? (
        <Card>
          <ReadRow label="Datum Reinigung" value={report.cleaningDate} />
          <View className="flex-row gap-2">
            <View className="flex-1"><ReadRow label="Uhrzeit von" value={report.timeFrom} /></View>
            <View className="flex-1"><ReadRow label="bis"         value={report.timeTo}   /></View>
          </View>
        </Card>
      ) : (
        <Card>
          <Field error={errors.cleaningDate} label="Datum Reinigung" onChangeText={(v) => updateReport({ cleaningDate: v })} placeholder={todayPlaceholder} value={report.cleaningDate} />
          <View className="flex-row gap-2">
            <Field containerStyle={{ flex: 1 }} label="Uhrzeit von" onChangeText={(v) => updateReport({ timeFrom: v })} placeholder="08:00" value={report.timeFrom} />
            <Field containerStyle={{ flex: 1 }} label="bis"         onChangeText={(v) => updateReport({ timeTo:   v })} placeholder="09:30" value={report.timeTo} />
          </View>
        </Card>
      )}

      {/* Work items */}
      <SectionHeader title="Arbeiten vor Ort" meta={`${cleanItems.length} Positionen`} />

      {/* Suggestions panel — only in draft with genesis context */}
      {!isCompleted && genesisContext ? (
        <Card>
          <View className="flex-row items-center justify-between flex-wrap gap-3">
            <View className="flex-row items-center gap-2">
              <Sparkles color={colors.primary} size={18} strokeWidth={2} />
              <Text className="text-h3 font-bold text-ink">Intelligente Vorschläge</Text>
            </View>
            {genesisContext.objectTariffSuggestions.some((w) => w.lineType !== 'control') ? (
              <Button
                disabled={allTariffApplied}
                icon={Plus}
                label={allTariffApplied ? 'Tarife übernommen' : 'Alle Tarife'}
                onPress={applyAllTariffs}
                variant="secondary"
              />
            ) : null}
          </View>

          {/* Segmented tabs */}
          <View className="flex-row gap-1 bg-surface-muted rounded-md p-1">
            {(['objectTariff', 'invoiceLine', 'history', 'arbvol'] as SuggestionTab[]).map((tab) => {
              const count = tab === 'objectTariff' ? genesisContext.objectTariffSuggestions.length
                          : tab === 'invoiceLine'  ? genesisContext.invoiceLineSuggestions.length
                          : tab === 'history'      ? genesisContext.history.length
                          : genesisContext.arbvolSummary.length;
              const label = tab === 'objectTariff' ? 'Tarife'
                          : tab === 'invoiceLine'  ? 'Rechnungen'
                          : tab === 'history'      ? 'Historie'
                          : 'Arbeitsvol.';
              const active = suggestionTab === tab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${label}, ${count} Vorschläge`}
                  onPress={() => setSuggestionTab(tab)}
                  className={['flex-1 items-center rounded-sm min-h-[44px] px-1 py-2 gap-0.5 justify-center', active ? 'bg-surface border border-border' : ''].join(' ')}
                  style={({ pressed }) => pressed ? { opacity: 0.75 } : undefined}
                >
                  <Text className={`text-small font-semibold text-center ${active ? 'text-primary' : 'text-muted'}`} numberOfLines={2}>{label}</Text>
                  <Text className={`text-xs font-bold ${active ? 'text-primary' : 'text-muted'}`}>{count}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Suggestion rows */}
          {suggestionTab === 'objectTariff' && (
            genesisContext.objectTariffSuggestions.length ? (
              <View className="gap-1">
                {genesisContext.objectTariffSuggestions.slice(0, 16).map((work) => {
                  const canApply = work.lineType !== 'control';
                  return (
                    <SuggestionRow
                      key={work.id}
                      actionLabel={!canApply ? 'Kontext' : isSuggestedWorkApplied(work) ? 'Übernommen' : '+'}
                      applied={!canApply || isSuggestedWorkApplied(work)}
                      meta={[work.lineType === 'control' && 'Kontrollzeile', work.tariffCode, work.quantity && `Anzahl ${work.quantity}`, work.tp && `${work.tp} TP`, work.amount && `CHF ${work.amount}`, work.minutes && `${work.minutes} Min.`].filter(Boolean).join(' · ')}
                      onPress={() => applyTariffSuggestion(work)}
                      subtitle={work.reason || work.notes}
                      title={work.description || 'Tarifposition'}
                    />
                  );
                })}
              </View>
            ) : <Text className="text-small text-muted">Keine Objekttarife für diese Liegenschaft vorhanden.</Text>
          )}
          {suggestionTab === 'invoiceLine' && (
            genesisContext.invoiceLineSuggestions.length ? (
              <View className="gap-1">
                {genesisContext.invoiceLineSuggestions.slice(0, 16).map((work) => {
                  const canApply = work.lineType !== 'control';
                  return (
                    <SuggestionRow
                      key={work.id}
                      actionLabel={!canApply ? 'Kontext' : isSuggestedWorkApplied(work) ? 'Übernommen' : '+'}
                      applied={!canApply || isSuggestedWorkApplied(work)}
                      meta={[work.invoiceNumber && `Rechnung ${work.invoiceNumber}`, work.position && `Pos. ${work.position}`, work.lineType === 'control' && 'Kontrollzeile', work.tariffCode, work.quantity && `Anzahl ${work.quantity}`, work.amount && `CHF ${work.amount}`, work.unitPrice && `à ${work.unitPrice}`].filter(Boolean).join(' · ')}
                      onPress={() => applyInvoiceLineSuggestion(work)}
                      subtitle={work.reason || work.notes}
                      title={work.description || 'Rechnungsposition'}
                    />
                  );
                })}
              </View>
            ) : <Text className="text-small text-muted">Keine Rechnungspositionen als Vorlage vorhanden.</Text>
          )}
          {suggestionTab === 'history' && (
            genesisContext.history.length ? (
              <View className="gap-1">
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
            ) : <Text className="text-small text-muted">Keine Historie aus Genesis vorhanden.</Text>
          )}
          {suggestionTab === 'arbvol' && (
            genesisContext.arbvolSummary.length ? (
              <View className="gap-1">
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
            ) : <Text className="text-small text-muted">Kein Arbeitsvolumen für diese Liegenschaft vorhanden.</Text>
          )}
        </Card>
      ) : null}

      {/* Completed items — read-only */}
      {isCompleted ? (
        <View className="gap-2">
          {cleanItems.length ? cleanItems.map((item, index) => (
            <Card key={item.id} compact>
              <Text className="text-base font-semibold text-ink leading-[22px]">{item.description || `Position ${index + 1}`}</Text>
              <Text className="text-small text-muted leading-[18px]">
                {[item.quantity && `Anzahl ${item.quantity}`, item.tp && `${item.tp} TP`, item.amount && `CHF ${item.amount}`, item.minutes && `${item.minutes} Min.`].filter(Boolean).join(' · ') || '-'}
              </Text>
            </Card>
          )) : (
            <Card compact><Text className="text-small text-muted">Keine Positionen erfasst.</Text></Card>
          )}
        </View>
      ) : (
        <>
          <View className="gap-2">
            {workItems.map((item, index) => (
              <Card key={item.id}>
                <View className="flex-row items-center gap-2 justify-between">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Position ${index + 1} bearbeiten`}
                    onPress={() => toggleItem(item.id)}
                    className="flex-1 flex-row items-center gap-2 min-h-[48px]"
                  >
                    {expandedItemIds.includes(item.id) || !item.description.trim()
                      ? <ChevronDown  color={colors.mutedLight} size={18} strokeWidth={2} />
                      : <ChevronRight color={colors.mutedLight} size={18} strokeWidth={2} />
                    }
                    <View className="flex-1 gap-0.5">
                      <Text className="text-base font-semibold text-ink leading-[22px]">{item.description || `Position ${index + 1}`}</Text>
                      <Text className="text-small text-muted leading-[18px]">
                        {[item.quantity && `Anzahl ${item.quantity}`, item.tp && `${item.tp} TP`, item.amount && `CHF ${item.amount}`, item.minutes && `${item.minutes} Min.`].filter(Boolean).join(' · ') || 'Zum Bearbeiten öffnen'}
                      </Text>
                    </View>
                  </Pressable>
                  {workItems.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Position ${index + 1} löschen`}
                      onPress={() => removeWorkItem(index)}
                      className="items-center justify-center rounded-md min-h-[44px] min-w-[44px]"
                    >
                      <Trash2 color={colors.danger} size={18} strokeWidth={2} />
                    </Pressable>
                  ) : null}
                </View>

                {expandedItemIds.includes(item.id) || !item.description.trim() ? (
                  <>
                    <Field label="Bezeichnung"  onChangeText={(v) => updateWorkItem(index, { description: v })} placeholder="Ausgeführte Arbeit" value={item.description} />
                    <View className="flex-row gap-2">
                      <Field containerStyle={{ flex: 1 }} keyboardType="decimal-pad" label="Anzahl" onChangeText={(v) => updateWorkItem(index, { quantity: v })} value={item.quantity} />
                      <Field containerStyle={{ flex: 1 }} keyboardType="decimal-pad" label="Min."   onChangeText={(v) => updateWorkItem(index, { minutes:  v })} value={item.minutes} />
                    </View>
                    <View className="flex-row gap-2">
                      <Field containerStyle={{ flex: 1 }} label="TP"     onChangeText={(v) => updateWorkItem(index, { tp:     v })} value={item.tp} />
                      <Field containerStyle={{ flex: 1 }} keyboardType="decimal-pad" label="Betrag" onChangeText={(v) => updateWorkItem(index, { amount: v })} value={item.amount} />
                    </View>
                  </>
                ) : null}
              </Card>
            ))}
          </View>
          <Button label="Position hinzufügen" icon={Plus} onPress={addWorkItem} variant="secondary" />
        </>
      )}

      {/* Notes & name */}
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
            onChangeText={(v) => updateReport({ notes: v })}
            style={{ minHeight: 112 }}
            textAlignVertical="top"
            value={report.notes}
          />
          <Field
            error={errors.chimneySweepName}
            label="Name Kaminfeger"
            onChangeText={(v) => updateReport({ chimneySweepName: v })}
            value={report.chimneySweepName}
          />
        </Card>
      )}

      {/* Export section */}
      {isCompleted ? (
        <Card>
          <View className="flex-row items-center gap-2">
            <FileText color={colors.primary} size={20} strokeWidth={2} />
            <Text className="text-h3 font-bold text-ink">Übergabe ans Büro</Text>
          </View>
          <Button label="PDF teilen" icon={Share2} loading={busy} onPress={sharePdf} variant="primary" />
          <Button
            label={showJson ? 'Strukturierte Daten ausblenden' : 'Strukturierte Daten anzeigen'}
            icon={FileJson2}
            onPress={() => setShowJson((c) => !c)}
            variant="ghost"
          />
          {showJson ? (
            <Text
              selectable
              className="text-xs text-ink leading-[17px] bg-surface-muted rounded-md p-3"
              style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
            >
              {structuredJson}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</Text>
      <Text className="text-base font-medium text-ink leading-6">{value || '-'}</Text>
    </View>
  );
}

function SuggestionRow({ actionLabel, applied, meta, onPress, subtitle, title }: {
  actionLabel: string;
  applied: boolean;
  meta: string;
  onPress: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <View className="flex-row items-center bg-surface-muted rounded-md gap-3 p-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-ink leading-[22px]">{title}</Text>
        <Text className="text-small text-muted leading-[18px]">{meta || '-'}</Text>
        {subtitle ? <Text className="text-small text-muted leading-[18px]">{subtitle}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={applied ? 'Vorschlag wurde bereits übernommen' : 'Vorschlag übernehmen'}
        disabled={applied}
        onPress={onPress}
        className={[
          'items-center justify-center rounded-sm min-h-[44px] px-3',
          applied ? 'bg-primary-soft border border-border min-w-[96px]' : 'bg-primary min-w-[44px]',
        ].join(' ')}
        style={({ pressed }) => pressed && !applied ? { opacity: 0.78 } : undefined}
      >
        <Text
          numberOfLines={1}
          className={`text-small font-bold ${applied ? 'text-primary' : 'text-white'}`}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function cleanWorkItems(items: WorkItem[]): WorkItem[] {
  return items
    .filter((item) => [item.quantity, item.description, item.tp, item.amount, item.minutes].some((v) => v.trim()))
    .map((item, i) => ({ ...item, sortOrder: i }));
}
function workFromPlannedSuggestion(reportId: string, work: GenesisPlannedWork): WorkItem {
  return { id: createId('item'), reportId, quantity: work.quantity, description: work.description || work.notes || 'Genesis-Vorschlag', tp: work.tp, amount: work.amount, minutes: work.minutes, sortOrder: 0 };
}
function workFromHistory(reportId: string, entry: GenesisHistoryEntry): WorkItem {
  return { id: createId('item'), reportId, quantity: '', description: entry.description || entry.notes || 'Historie-Vorschlag', tp: '', amount: '', minutes: entry.minutes, sortOrder: 0 };
}
function workItemSignature(item: Pick<WorkItem, 'quantity' | 'description' | 'tp' | 'amount' | 'minutes'>): string {
  return [item.quantity, item.description, item.tp, item.amount, item.minutes].map((v) => v.trim().toLowerCase()).join('|');
}
function statusLabel(status: ServiceReport['status']): string {
  if (status === 'exported')  return 'Exportiert';
  if (status === 'completed') return 'Abgeschlossen';
  return 'Entwurf';
}
function statusBadge(status: ServiceReport['status']): { bg: string; text: string } {
  if (status === 'exported')  return { bg: 'bg-primary-soft', text: 'text-success' };
  if (status === 'completed') return { bg: 'bg-info-soft',    text: 'text-info' };
  return { bg: 'bg-accent-soft', text: 'text-warning' };
}
