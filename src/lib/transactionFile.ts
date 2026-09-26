// Turning an uploaded spreadsheet into a grid of strings.
//
// This file knows nothing about transactions. It reads CSV and XLSX into
// `string[][]` and stops there; what a column means is transactionImport.ts's
// problem. Keeping the two apart is what makes the mapping testable against a
// grid typed by hand.
//
// XLSX is read without a dependency. It is a zip of XML, the browser has
// DecompressionStream and DOMParser, and the alternative -- SheetJS -- is a
// ~700KB parser of every spreadsheet format written since 1987, pulled in to
// read the flat single-sheet export a bank produces. The same argument the
// charts make: one ring is not worth a library.
//
// What this deliberately does not read: .xls (the pre-2007 binary format, a
// different problem entirely), encrypted workbooks, and anything with its rows
// spread over multiple sheets. Each says so rather than returning a grid that
// is quietly missing half the file.

export interface SheetGrid {
  rows: string[][];
  /** Named so a workbook with several sheets can say which one was read. */
  sheetName: string | null;
  /** Other sheets in the workbook, so the user can be offered them. */
  otherSheets: string[];
}

export class TransactionFileError extends Error {}

// ============================================================
// CSV
// ============================================================

/**
 * Banks disagree about the separator -- a comma in the US, a semicolon
 * anywhere a comma is the decimal mark, a tab from anything that exported
 * "for Excel". Guessed from the line with the most consistent count rather
 * than the first line, because the first line is often a title.
 */
export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestScore = -1;

  for (const delimiter of candidates) {
    // Count outside quotes, so a comma inside "SMITH, JOHN" does not vote.
    const counts = sample.map((line) => {
      let inQuotes = false;
      let n = 0;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === delimiter && !inQuotes) n += 1;
      }
      return n;
    });
    const nonZero = counts.filter((c) => c > 0);
    if (nonZero.length === 0) continue;
    // Consistency across lines beats raw frequency: a delimiter that yields
    // the same column count on every line is the real one.
    const mode = nonZero.sort((a, b) => a - b)[Math.floor(nonZero.length / 2)];
    const agreeing = nonZero.filter((c) => c === mode).length;
    const score = agreeing * 10 + mode;
    if (score > bestScore) { bestScore = score; best = delimiter; }
  }
  return best;
}

/** RFC 4180, plus the doubled-quote escape everyone actually uses. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  // A UTF-8 BOM otherwise becomes part of the first header name, so "Date"
  // stops matching and the whole file reads as unmapped.
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const sep = delimiter ?? detectDelimiter(body);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];

    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === sep) { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

// ============================================================
// XLSX -- a zip of XML
// ============================================================

const u16 = (view: DataView, at: number) => view.getUint16(at, true);
const u32 = (view: DataView, at: number) => view.getUint32(at, true);

interface ZipEntry { name: string; method: number; offset: number; compressed: number }

function readCentralDirectory(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // The end-of-central-directory record sits at the end, behind a comment of
  // up to 64KB. Scanned backwards for its signature.
  let eocd = -1;
  const floor = Math.max(0, bytes.length - 0x10000 - 22);
  for (let i = bytes.length - 22; i >= floor; i -= 1) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new TransactionFileError('This file is not a readable .xlsx workbook.');

  const count = u16(view, eocd + 10);
  let at = u32(view, eocd + 16);
  if (at === 0xffffffff || count === 0xffff) {
    throw new TransactionFileError('This workbook uses the ZIP64 format, which Command cannot read. Export it as CSV instead.');
  }

  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    if (u32(view, at) !== 0x02014b50) break;
    const nameLength = u16(view, at + 28);
    const extraLength = u16(view, at + 30);
    const commentLength = u16(view, at + 32);
    entries.push({
      name: new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength)),
      method: u16(view, at + 10),
      compressed: u32(view, at + 20),
      offset: u32(view, at + 42),
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (u32(view, entry.offset) !== 0x04034b50) {
    throw new TransactionFileError('This .xlsx workbook is damaged and cannot be read.');
  }
  // The local header repeats the name and extra fields, and its lengths are
  // the authoritative ones -- the central directory's extra field is often a
  // different length.
  const start = entry.offset + 30 + u16(view, entry.offset + 26) + u16(view, entry.offset + 28);
  const slice = bytes.subarray(start, start + entry.compressed);

  if (entry.method === 0) return new TextDecoder().decode(slice);
  if (entry.method !== 8) {
    throw new TransactionFileError('This workbook uses a compression Command cannot read. Export it as CSV instead.');
  }

  // A copy, because DecompressionStream will not take a view onto a larger
  // buffer without one.
  const stream = new Blob([slice.slice()]).stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

const xml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');

/** A1 -> 0, AB12 -> 27. Cells are sparse, so position comes from the name. */
function columnIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Excel stores a date as a day count with a date format hung off it, so a
 * column of dates arrives as 45678 unless the styles are read too. Built-in
 * format ids 14-22 and 45-47 are dates and times; custom ones are recognized
 * by their pattern.
 */
function dateStyles(stylesXml: string | null): Set<number> {
  const dates = new Set<number>();
  if (!stylesXml) return dates;
  const doc = xml(stylesXml);

  const custom = new Map<number, string>();
  for (const node of [...doc.getElementsByTagName('numFmt')]) {
    const id = Number(node.getAttribute('numFmtId'));
    if (Number.isFinite(id)) custom.set(id, node.getAttribute('formatCode') ?? '');
  }

  const builtIn = (id: number) => (id >= 14 && id <= 22) || (id >= 45 && id <= 47);
  const looksLikeADate = (code: string) =>
    // Strip quoted literals and escapes first, so "Month" does not read as a
    // month token.
    /[dmyh]/i.test(code.replace(/"[^"]*"/g, '').replace(/\\./g, ''));

  const cellXfs = doc.getElementsByTagName('cellXfs')[0];
  if (!cellXfs) return dates;
  [...cellXfs.getElementsByTagName('xf')].forEach((xf, index) => {
    const id = Number(xf.getAttribute('numFmtId'));
    if (!Number.isFinite(id)) return;
    if (builtIn(id) || (custom.has(id) && looksLikeADate(custom.get(id)!))) dates.add(index);
  });
  return dates;
}

/** Excel's day zero is 1899-12-30 -- day 1 is Jan 1 1900, and 1900 is wrongly a leap year. */
export function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > 60000) return null;
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export async function parseWorkbook(buffer: ArrayBuffer, sheetName?: string): Promise<SheetGrid> {
  if (typeof DecompressionStream === 'undefined') {
    throw new TransactionFileError('This browser cannot open .xlsx files. Export the file as CSV instead.');
  }

  const entries = readCentralDirectory(buffer);
  const find = (name: string) => entries.find((e) => e.name === name);
  const text = async (name: string) => {
    const entry = find(name);
    return entry ? readEntry(buffer, entry) : null;
  };

  if (find('EncryptedPackage')) {
    throw new TransactionFileError('This workbook is password protected. Remove the password, or export it as CSV.');
  }

  // Sheet order in the zip is not the order in the workbook, so the first
  // sheet is the one workbook.xml lists first, resolved through the rels.
  const workbookXml = await text('xl/workbook.xml');
  if (!workbookXml) throw new TransactionFileError('This file is not a readable .xlsx workbook.');

  const relsXml = await text('xl/_rels/workbook.xml.rels');
  const targets = new Map<string, string>();
  if (relsXml) {
    for (const node of [...xml(relsXml).getElementsByTagName('Relationship')]) {
      const id = node.getAttribute('Id');
      const target = node.getAttribute('Target');
      if (id && target) targets.set(id, target.replace(/^\/?(xl\/)?/, ''));
    }
  }

  const sheets = [...xml(workbookXml).getElementsByTagName('sheet')].map((node, i) => {
    const rid = node.getAttribute('r:id') ?? node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    return {
      name: node.getAttribute('name') ?? `Sheet${i + 1}`,
      path: `xl/${(rid && targets.get(rid)) || `worksheets/sheet${i + 1}.xml`}`,
    };
  });
  if (sheets.length === 0) throw new TransactionFileError('This workbook has no sheets in it.');

  const chosen = (sheetName && sheets.find((s) => s.name === sheetName)) || sheets[0];
  const sheetXml = await text(chosen.path);
  if (!sheetXml) throw new TransactionFileError(`Could not read the sheet "${chosen.name}".`);

  const sharedXml = await text('xl/sharedStrings.xml');
  const shared = sharedXml
    ? [...xml(sharedXml).getElementsByTagName('si')].map((si) =>
      [...si.getElementsByTagName('t')].map((t) => t.textContent ?? '').join(''))
    : [];

  const dateFormats = dateStyles(await text('xl/styles.xml'));

  const rows: string[][] = [];
  for (const rowNode of [...xml(sheetXml).getElementsByTagName('row')]) {
    const cells: string[] = [];
    for (const cell of [...rowNode.getElementsByTagName('c')]) {
      const ref = cell.getAttribute('r');
      const at = ref ? columnIndex(ref) : cells.length;
      while (cells.length < at) cells.push('');

      const type = cell.getAttribute('t');
      const raw = cell.getElementsByTagName('v')[0]?.textContent ?? '';
      let value: string;

      if (type === 's') value = shared[Number(raw)] ?? '';
      else if (type === 'inlineStr') {
        value = [...cell.getElementsByTagName('t')].map((t) => t.textContent ?? '').join('');
      } else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
      else {
        const style = Number(cell.getAttribute('s'));
        const asDate = Number.isFinite(style) && dateFormats.has(style)
          ? excelSerialToISO(Number(raw)) : null;
        value = asDate ?? raw;
      }
      cells.push(value.trim());
    }
    if (cells.some((c) => c !== '')) rows.push(cells);
  }

  return {
    rows,
    sheetName: chosen.name,
    otherSheets: sheets.map((s) => s.name).filter((n) => n !== chosen.name),
  };
}

// ============================================================

export async function readTransactionFile(file: File, sheetName?: string): Promise<SheetGrid> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xls')) {
    throw new TransactionFileError('This is the older .xls format. Open it and save as .xlsx or CSV, and Command can read it.');
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    return parseWorkbook(await file.arrayBuffer(), sheetName);
  }
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    return { rows: parseDelimited(await file.text()), sheetName: null, otherSheets: [] };
  }
  throw new TransactionFileError('Command reads .csv and .xlsx transaction exports. This file is neither.');
}
