/*
 * Olivenernte 2026 – Backend (Google Apps Script)
 *
 * Einrichtung:
 * 1. Neues Google Sheet anlegen → Erweiterungen → Apps Script → diesen Code einfügen.
 * 2. Projekteinstellungen → Skripteigenschaften → "PIN" = dein Admin-PIN.
 * 3. Bereitstellen → Neue Bereitstellung → Typ "Web-App"
 *      Ausführen als: Ich · Zugriff: Jeder  → URL kopieren.
 * 4. URL in config.js bei apiUrl eintragen. Fertig.
 *
 * Daten liegen als JSON im Tab "data" (Zelle A1), lesbare Tabellen in "Ernte" und "Mühle".
 * Fotos landen im Drive-Ordner "Olivenernte 2026 Fotos" (Link-Freigabe: Ansehen).
 */

function pin_() { return PropertiesService.getScriptProperties().getProperty('PIN') || '2026'; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet_(name) { const ss = SpreadsheetApp.getActive(); return ss.getSheetByName(name) || ss.insertSheet(name); }

function doGet() {
  const v = sheet_('data').getRange('A1').getValue();
  return out_({ ok: true, state: v ? JSON.parse(v) : null });
}

function doPost(e) {
  const b = JSON.parse(e.postData.contents);
  if (String(b.pin) !== String(pin_())) return out_({ ok: false, error: 'PIN falsch' });
  if (b.action === 'auth') return out_({ ok: true });

  if (b.action === 'save') {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      sheet_('data').getRange('A1').setValue(JSON.stringify(b.state));
      writeTables_(b.state);
    } finally { lock.releaseLock(); }
    return out_({ ok: true });
  }

  if (b.action === 'upload') {
    const it = DriveApp.getFoldersByName('Olivenernte 2026 Fotos');
    const folder = it.hasNext() ? it.next() : DriveApp.createFolder('Olivenernte 2026 Fotos');
    const m = String(b.data).match(/^data:(.+?);base64,(.*)$/);
    const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], b.name || 'foto.jpg');
    const f = folder.createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return out_({ ok: true, url: 'https://lh3.googleusercontent.com/d/' + f.getId() });
  }
  return out_({ ok: false, error: 'unbekannte Aktion' });
}

function writeTables_(s) {
  const h = sheet_('Ernte'); h.clear();
  h.appendRow(['Datum', 'kg', 'Sektor']);
  (s.harvest || []).forEach(r => h.appendRow([r.date, r.kg, r.sector]));
  const m = sheet_('Mühle'); m.clear();
  m.appendRow(['Datum', 'Oliven kg (Fabrizio)', 'Öl kg', 'Öl L', 'Ölgehalt %']);
  (s.mill || []).forEach(r => m.appendRow([r.date, r.kg, r.oilKg, r.oilL, r.kg ? Math.round(r.oilKg / r.kg * 1000) / 10 : '']));
}
