import logger from "~~/server/utils/log";
import {
  SHEET_IDS,
  getSheetsClient,
  getSpreadsheetId,
} from "~~/server/utils/sheets";

// Mirrors the "Web Monthly" QUERY formula (see query-sheet.md), but for any
// month/year instead of the single month stored in Web Monthly!A1.
const SOURCES = [
  { key: "buku_kas", pos: "Buku Kas" },
  { key: "kas_pompa_air", pos: "Kas Pompa Air" },
  { key: "kas_pompa_jasmine", pos: "Kas Pompa Jasmine" },
  { key: "kas_event", pos: "Kas Event" },
  { key: "kas_rt", pos: "Kas RT" },
  { key: "kas_keamanan", pos: "Kas Keamanan" },
];

export type ExportRow = {
  tanggal: string; // YYYY-MM-DD
  uraian: string;
  nama: string;
  jumlah: number;
  jenis: "In" | "Out";
  pos: string;
};

// Google Sheets serial dates count days from 1899-12-30
const SHEETS_EPOCH = Date.UTC(1899, 11, 30);

const toDate = (value: unknown): Date | null => {
  if (typeof value === "number") {
    return new Date(SHEETS_EPOCH + Math.round(value * 86400000));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;
    // Normalize to UTC midnight so getUTC* matches the serial-number path
    return new Date(
      Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
    );
  }
  return null;
};

const toAmount = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
  }
  return 0;
};

const isFilled = (value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== "";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const month = parseInt(query.month as string, 10);
  const year = parseInt(query.year as string, 10);

  if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Query month (1-12) and year are required",
    });
  }

  // Fail fast for future periods; use Jakarta time so the month boundary
  // matches the residents' calendar rather than the server's timezone
  const [currentYear, currentMonth] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  if (year * 12 + month > currentYear! * 12 + currentMonth!) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cannot export a month that hasn't happened yet",
    });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sources = SOURCES.map((source) => {
      const title = spreadsheetInfo.data.sheets?.find(
        (sheet) => sheet.properties?.sheetId === SHEET_IDS[source.key],
      )?.properties?.title;
      if (!title) {
        throw createError({
          statusCode: 404,
          statusMessage: `Sheet for "${source.pos}" not found`,
        });
      }
      return { ...source, title };
    });

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: sources.map((source) => `'${source.title}'!A:ZZ`),
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    });

    const rows: ExportRow[] = [];

    response.data.valueRanges?.forEach((valueRange, index) => {
      const source = sources[index]!;
      const [headerRow = [], ...dataRows] = valueRange.values ?? [];
      // Look columns up by header name; the column letters differ per sheet
      const col = (name: string) =>
        headerRow.findIndex((header) => String(header).trim() === name);
      const tanggalCol = col("Tanggal");
      const uraianCol = col("Uraian");
      const namaCol = col("Nama");
      const masukCol = col("Masuk");
      const keluarCol = col("Keluar");

      if (tanggalCol < 0 || uraianCol < 0 || masukCol < 0 || keluarCol < 0) {
        logger.warn(`Missing expected headers in sheet "${source.title}"`);
        return;
      }

      for (const row of dataRows) {
        const date = toDate(row[tanggalCol]);
        if (
          !date ||
          date.getUTCMonth() + 1 !== month ||
          date.getUTCFullYear() !== year
        ) {
          continue;
        }

        const uraian = String(row[uraianCol] ?? "").trim();
        // Same as ISERROR(FIND("Pemindahan", ...)) — case-sensitive
        if (uraian.includes("Pemindahan")) continue;

        const base = {
          tanggal: date.toISOString().slice(0, 10),
          uraian,
          nama: namaCol >= 0 ? String(row[namaCol] ?? "").trim() : "",
          pos: source.pos,
        };

        if (isFilled(row[masukCol])) {
          rows.push({ ...base, jumlah: toAmount(row[masukCol]), jenis: "In" });
        }
        if (isFilled(row[keluarCol])) {
          rows.push({
            ...base,
            jumlah: toAmount(row[keluarCol]),
            jenis: "Out",
          });
        }
      }
    });

    // Oldest first so the rincian reads chronologically
    rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    const sum = (jenis: ExportRow["jenis"]) =>
      rows
        .filter((row) => row.jenis === jenis)
        .reduce((total, row) => total + row.jumlah, 0);

    return {
      success: true,
      month,
      year,
      pemasukan: sum("In"),
      pengeluaran: sum("Out"),
      rows,
    };
  } catch (error) {
    logger.error("Error building monthly export:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : "Failed to build export",
    });
  }
});
