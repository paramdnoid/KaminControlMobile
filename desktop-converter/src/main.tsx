import React from 'react';
import { createRoot } from 'react-dom/client';

import './styles.css';
import type { ConverterResult } from './genesisConverter';

function App() {
  const [zipPath, setZipPath] = React.useState('');
  const [result, setResult] = React.useState<ConverterResult | null>(null);
  const [savedPath, setSavedPath] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function pickZip() {
    setError('');
    const picked = await window.genesisConverter.pickZip();
    if (picked) {
      setZipPath(picked);
      setResult(null);
      setSavedPath('');
    }
  }

  async function convert() {
    if (!zipPath) {
      setError('Bitte zuerst eine Genesis-Sicherung auswählen.');
      return;
    }

    setBusy(true);
    setError('');
    setSavedPath('');
    try {
      setResult(await window.genesisConverter.convertZip(zipPath));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Genesis-ZIP konnte nicht konvertiert werden.');
    } finally {
      setBusy(false);
    }
  }

  async function saveExportFolder() {
    if (!result) {
      return;
    }

    setBusy(true);
    setError('');
    try {
      const nextPath = await window.genesisConverter.saveExportFolder(result.audit.sourcePath, result.bundle);
      if (nextPath) {
        setSavedPath(nextPath);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Genesis-Exportordner konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  }

  async function saveTransportZip() {
    if (!result) {
      return;
    }

    setBusy(true);
    setError('');
    try {
      const nextPath = await window.genesisConverter.saveTransportZip(result.audit.sourcePath, result.bundle);
      if (nextPath) {
        setSavedPath(nextPath);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Genesis-Transport-ZIP konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  }

  const warningCount = result?.bundle.metadata.warnings.length ?? 0;
  const objectTariffSuggestionCount = result?.bundle.plannedWork.filter((item) => item.source === 'objectTariff').length ?? 0;
  const invoiceLineSuggestionCount = result?.bundle.plannedWork.filter((item) => item.source === 'invoiceLine').length ?? 0;
  const arbvolCount = result?.bundle.plannedWork.filter((item) => item.source === 'arbvol').length ?? 0;
  const documentCounts = result?.bundle.metadata.documentCounts ?? {};

  return (
    <main className="shell">
      <section className="header">
        <div>
          <p className="eyebrow">KaminControlMobile</p>
          <h1>Genesis Converter</h1>
          <p className="lead">
            Wandelt den lokalen Rielo/Genesis-Export in ein mobiles Import-Bundle um. MDB-Dateien bleiben auf dem Desktop.
          </p>
        </div>
        <div className="statusPill">Offline lokal</div>
      </section>

      <section className="panel steps">
        <div className="step">
          <span className="stepIndex">1</span>
          <div>
            <h2>Genesis-Sicherung auswählen</h2>
            <p>{zipPath || 'Noch keine Datei gewählt.'}</p>
          </div>
          <button type="button" className="secondary" onClick={pickZip} disabled={busy}>
            Datei wählen
          </button>
        </div>
        <div className="step">
          <span className="stepIndex">2</span>
          <div>
            <h2>Validieren und konvertieren</h2>
            <p>Kerntabellen werden gelesen, gezählt und fachlich normalisiert.</p>
          </div>
          <button type="button" onClick={convert} disabled={busy || !zipPath}>
            {busy ? 'Arbeite...' : 'Konvertieren'}
          </button>
        </div>
        <div className="step">
          <span className="stepIndex">3</span>
          <div>
            <h2>Exportordner speichern</h2>
            <p>{savedPath || 'Speichert genesis-export-v2.json und PDF-Dateien für die Mobile-App.'}</p>
          </div>
          <div className="buttonGroup">
            <button type="button" onClick={saveExportFolder} disabled={busy || !result}>
              Exportordner speichern
            </button>
            <button type="button" className="secondary" onClick={saveTransportZip} disabled={busy || !result}>
              Transport-ZIP
            </button>
          </div>
        </div>
      </section>

      {error ? <section className="error">{error}</section> : null}

      {result ? (
        <>
          <section className="metrics">
            <Metric label="Liegenschaften" value={result.bundle.properties.length} />
            <Metric label="Anlagen" value={result.bundle.installations.length} />
            <Metric label="Objekttarife" value={objectTariffSuggestionCount} />
            <Metric label="Rechnungspositionen" value={result.bundle.invoiceLines?.length ?? 0} />
            <Metric label="Rechnungen" value={result.bundle.invoices?.length ?? 0} />
            <Metric label="Rechnung-PDFs" value={documentCounts.invoice ?? 0} />
            <Metric label="Rapport-PDFs" value={documentCounts.rapport ?? 0} />
            <Metric label="Rechnungsvorschläge" value={invoiceLineSuggestionCount} />
            <Metric label="Arbeitsvolumen" value={arbvolCount} />
            <Metric label="Historie" value={result.bundle.history.length} />
            <Metric label="Warnungen" value={warningCount} tone={warningCount ? 'warn' : 'ok'} />
          </section>

          <section className="grid">
            <div className="panel">
              <h2>Tabellenzählung</h2>
              <div className="tableCounts">
                {Object.entries(result.bundle.metadata.tableCounts).map(([table, count]) => (
                  <div className="countRow" key={table}>
                    <span>{table}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h2>Warnungen</h2>
              {result.bundle.metadata.warnings.length ? (
                <ul className="warnings">
                  {result.bundle.metadata.warnings.slice(0, 16).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Keine Warnungen. Das Bundle ist bereit für den Mobile-Import.</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warn' | 'ok' }) {
  return (
    <div className={`metric ${tone}`}>
      <strong>{value.toLocaleString('de-CH')}</strong>
      <span>{label}</span>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
