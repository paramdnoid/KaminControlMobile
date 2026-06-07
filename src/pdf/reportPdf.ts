import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { displayAddressRole, displayBuildingType, displayFuelTypes } from '../data/options';
import type { ReportBundle } from '../types';
import { formatDate } from '../utils/date';
import { escapeHtml, joinAddress } from '../utils/text';

function row(label: string, value: string): string {
  return `
    <div class="field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || '-')}</strong>
    </div>
  `;
}

function multiline(label: string, value: string): string {
  // Strip \r so Windows/MDB line endings (\r\n) don't appear as literal characters in HTML.
  const normalised = (value || '-').replace(/\r/g, '');
  return `
    <div class="multiline">
      <span>${escapeHtml(label)}</span>
      <p>${escapeHtml(normalised).replace(/\n/g, '<br />')}</p>
    </div>
  `;
}

function printReportHtmlOnWeb(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Web-Druck ist in dieser Umgebung nicht verfuegbar.'));
      return;
    }

    const frame = document.createElement('iframe');
    frame.title = 'KaminControlMobile Rapport PDF';
    frame.style.border = '0';
    frame.style.height = '1123px';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    frame.style.position = 'fixed';
    frame.style.right = '100%';
    frame.style.top = '0';
    frame.style.width = '794px';

    frame.onload = () => {
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        document.body.removeChild(frame);
        reject(new Error('Druckfenster konnte nicht geoeffnet werden.'));
        return;
      }

      // 100 ms: wait for the iframe DOM to finish rendering before calling print().
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          // 1 000 ms: the browser print dialog is synchronous on most browsers,
          // but some fire the onload before resources (fonts/images) are fully
          // available. The delay lets the print job flush before we remove the
          // iframe. This is a known Expo web platform limitation; there is no
          // reliable afterprint event across all browsers.
          window.setTimeout(() => {
            document.body.removeChild(frame);
            resolve();
          }, 1000);
        } catch (error) {
          document.body.removeChild(frame);
          reject(error instanceof Error ? error : new Error('PDF-Druck konnte nicht gestartet werden.'));
        }
      }, 100);
    };

    document.body.appendChild(frame);
    frame.srcdoc = html;
  });
}

export function buildStructuredReport(bundle: ReportBundle, exportedAt: string = new Date().toISOString()): string {
  return JSON.stringify(
    {
      schema: 'kamincontrolmobile.report.v1',
      exportedAt,
      property: bundle.property,
      report: bundle.report,
      workItems: bundle.workItems,
    },
    null,
    2,
  );
}

export function buildReportHtml(bundle: ReportBundle): string {
  const { property, report, workItems } = bundle;
  const address = joinAddress(property.street, property.postalCode, property.city);
  const totalMinutes = workItems.reduce((sum, item) => {
    const minutes = Number.parseFloat(item.minutes.replace(',', '.'));
    return Number.isFinite(minutes) ? sum + minutes : sum;
  }, 0);

  return `
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 26px; }
          html {
            background: #fff;
          }
          body {
            background: #fff;
            color: #221f1b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            line-height: 1.36;
            margin: 0;
          }
          h1 {
            border-bottom: 2px solid #221f1b;
            font-size: 22px;
            margin: 0 0 14px;
            padding-bottom: 8px;
          }
          h2 {
            color: #24524a;
            font-size: 14px;
            margin: 18px 0 8px;
          }
          .grid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(2, 1fr);
          }
          .grid4 {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(4, 1fr);
          }
          .field, .multiline {
            border: 1px solid #d6cec0;
            border-radius: 6px;
            padding: 7px 8px;
          }
          .field span, .multiline span {
            color: #6e665e;
            display: block;
            font-size: 10px;
            margin-bottom: 3px;
          }
          .field strong {
            font-size: 12px;
            font-weight: 650;
          }
          .multiline p {
            margin: 0;
            min-height: 30px;
          }
          table {
            border-collapse: collapse;
            margin-top: 8px;
            width: 100%;
          }
          thead {
            display: table-header-group;
          }
          tr, .field, .multiline {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #d6cec0;
            padding: 7px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #ece7de;
            color: #221f1b;
            font-size: 10px;
            text-transform: uppercase;
          }
          .meta {
            color: #6e665e;
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .signature {
            display: grid;
            gap: 18px;
            grid-template-columns: repeat(3, 1fr);
            margin-top: 28px;
          }
          .line {
            border-top: 1px solid #221f1b;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <h1>Datenrapport Kaminfeger</h1>
        <div class="meta">
          <span>Rapport-ID: ${escapeHtml(report.id)}</span>
          <span>Status: ${escapeHtml(report.status)}</span>
        </div>

        <h2>Liegenschaft</h2>
        <div class="grid">
          ${row('Kundennummer', property.customerNumber)}
          ${row('Liegenschaft', property.propertyLabel || address)}
          ${row('Adresse', address)}
          ${row('Gebaeudeart', displayBuildingType(property.buildingType, property.otherBuildingType))}
        </div>

        <h2>Kontaktrollen</h2>
        <div class="grid4">
          ${multiline('Eigentuemer', property.owner)}
          ${multiline('Mieter', property.tenant)}
          ${multiline('Verwaltung', property.management)}
          ${multiline('Hauswart', property.caretaker)}
        </div>
        <div class="grid" style="margin-top: 8px;">
          ${row('Rechnungsadresse ist', displayAddressRole(property.billingRole))}
          ${row('Avisierungsadresse ist', displayAddressRole(property.notificationRole))}
        </div>

        <h2>Feuerungsanlagen</h2>
        <div class="grid">
          ${row('Brennstoff', displayFuelTypes(property.fuelTypes))}
          ${row('Anlagen im Haus', property.fireSystemCodes.join(', '))}
          ${row('Oelheizung Kessel', property.oilBoiler)}
          ${row('kWh', property.kwh)}
          ${row('Baujahr', property.buildYear)}
          ${row('Tour', property.tour)}
          ${row('Reinigung in den Monaten', property.cleaningMonths.join(', '))}
        </div>

        <h2>Reinigung</h2>
        <div class="grid">
          ${row('Datum Reinigung', formatDate(report.cleaningDate))}
          ${row('Uhrzeit', `${report.timeFrom || '-'} bis ${report.timeTo || '-'}`)}
          ${row('Name Kaminfeger', report.chimneySweepName)}
          ${row('Gesamtminuten', totalMinutes ? `${totalMinutes}` : '-')}
        </div>

        <h2>Arbeiten vor Ort</h2>
        <table>
          <thead>
            <tr>
              <th>Anzahl</th>
              <th>Bezeichnung</th>
              <th>TP</th>
              <th>Betrag</th>
              <th>Min.</th>
            </tr>
          </thead>
          <tbody>
            ${
              workItems.length
                ? workItems
                    .map(
                      (item) => `
                        <tr>
                          <td>${escapeHtml(item.quantity)}</td>
                          <td>${escapeHtml(item.description)}</td>
                          <td>${escapeHtml(item.tp)}</td>
                          <td>${escapeHtml(item.amount)}</td>
                          <td>${escapeHtml(item.minutes)}</td>
                        </tr>
                      `,
                    )
                    .join('')
                : '<tr><td colspan="5">Keine Leistungspositionen erfasst.</td></tr>'
            }
          </tbody>
        </table>

        <h2>Bemerkungen</h2>
        ${multiline('Bemerkungen', report.notes)}

        <div class="signature">
          <div class="line">Datum</div>
          <div class="line">Name Kaminfeger</div>
          <div class="line">Interner Abschluss</div>
        </div>
      </body>
    </html>
  `;
}

export async function createReportPdf(bundle: ReportBundle): Promise<string> {
  if (Platform.OS === 'web') {
    await printReportHtmlOnWeb(buildReportHtml(bundle));
    return '';
  }

  const { uri } = await Print.printToFileAsync({
    html: buildReportHtml(bundle),
    base64: false,
  });

  return uri;
}

// 'printed': handed to the web print dialog. 'shared': passed to the native share
// sheet. 'saved': PDF created but sharing unavailable on this device — caller must
// tell the user the file was not handed off.
export type ShareOutcome = { method: 'printed' | 'shared' | 'saved'; uri: string };

export async function shareReportPdf(bundle: ReportBundle): Promise<ShareOutcome> {
  const uri = await createReportPdf(bundle);
  if (!uri) {
    return { method: 'printed', uri: '' };
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return { method: 'saved', uri };
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Rapport teilen',
    UTI: 'com.adobe.pdf',
  });
  return { method: 'shared', uri };
}
