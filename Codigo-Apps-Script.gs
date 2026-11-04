/**
 * WaLead — Receptor de leads en Google Sheets
 * ------------------------------------------------------------
 * Este código recibe los datos del widget y los guarda como una
 * fila nueva en la hoja de cálculo. No requiere servidor propio.
 *
 * CÓMO INSTALARLO (una sola vez por cliente):
 *  1. Crear una Google Sheet nueva (sheets.new).
 *  2. Menú  Extensiones ▸ Apps Script.
 *  3. Borrar el contenido y pegar TODO este archivo.
 *  4. Menú  Implementar ▸ Nueva implementación.
 *       - Tipo:  Aplicación web
 *       - Ejecutar como:  Yo
 *       - Quién tiene acceso:  Cualquier persona
 *  5. Copiar la "URL de la aplicación web" (termina en /exec).
 *  6. Pegar esa URL en el widget:  data-sheet="....../exec"
 *
 * Si más adelante cambias el código, usa  Implementar ▸ Gestionar
 * implementaciones ▸ editar ▸ Nueva versión  (así la URL no cambia).
 * ------------------------------------------------------------
 */

// Nombre de la pestaña donde se guardan los leads.
var HOJA = "Leads";

function doPost(e) {
  // El candado evita que dos envíos simultáneos dupliquen filas o encabezados.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA);

    // Recolecta todas las claves recibidas.
    var keys = Object.keys(data);

    // Si la hoja está vacía, escribe encabezados: Fecha + claves recibidas.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Fecha"].concat(keys));
    }

    // Alinea los valores con el orden de los encabezados existentes.
    var headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    // Un lead_id ya guardado es la misma persona: no se agrega otra fila.
    if (data.lead_id && yaExiste(sheet, headers, data.lead_id)) {
      return json({ ok: true, duplicado: true });
    }

    // Agrega columnas nuevas si aparece una clave que no existía.
    keys.forEach(function (k) {
      if (headers.indexOf(k) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(k);
        headers.push(k);
      }
    });

    var row = headers.map(function (h) {
      if (h === "Fecha") return fechaAds(ss);
      return data[h] !== undefined ? asText(data[h]) : "";
    });
    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function yaExiste(sheet, headers, id) {
  var col = headers.indexOf("lead_id");
  var filas = sheet.getLastRow() - 1;
  if (col === -1 || filas < 1) return false;
  return sheet
    .getRange(2, col + 1, filas, 1)
    .getValues()
    .some(function (r) {
      return r[0] === id;
    });
}

// Fecha lista para conversiones offline de Google Ads: 2026-11-04 17:21:46-0300.
// Va como texto para que Sheets no la convierta y pierda la zona horaria.
function fechaAds(ss) {
  return "'" + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm:ssZ");
}

// Guarda como texto los valores que Sheets interpretaría como número o
// fórmula: así el teléfono conserva su "+" (ej: +5491122334455).
function asText(v) {
  v = String(v);
  return /^[+=\-@]/.test(v) ? "'" + v : v;
}

// Permite probar la URL desde el navegador (GET) sin romper nada.
function doGet(e) {
  return json({ ok: true, msg: "WaLead endpoint activo." });
}

function json(obj) {
  return ContentService.createTextOutput(
    JSON.stringify(obj)
  ).setMimeType(ContentService.MimeType.JSON);
}
