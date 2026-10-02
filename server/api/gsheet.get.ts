import logger from "~~/server/utils/log";
import {
  SHEET_IDS,
  getSheetsClient,
  getSpreadsheetId,
} from "~~/server/utils/sheets";
import { snakeCase } from "jalutils";

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event);
    const requestedSheet = (query.sheet as string) || null;
    // Optional 1-indexed header row (defaults to row 1). Useful for sheets
    // where the table doesn't start at the top (e.g. Web Monthly detail at A4).
    const headerRowParam = query.headerRow
      ? parseInt(query.headerRow as string, 10)
      : 1;
    const headerRowIndex =
      Number.isFinite(headerRowParam) && headerRowParam > 0
        ? headerRowParam - 1
        : 0;
    const requestedSheetKey = requestedSheet ? snakeCase(requestedSheet) : null;
    const requestedSheetId = requestedSheetKey
      ? SHEET_IDS[requestedSheetKey]
      : null;

    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    // First, get the spreadsheet metadata to find the correct sheet name
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    let targetSheet;

    if (requestedSheet) {
      if (requestedSheetId === undefined) {
        const availableSheets = Object.keys(SHEET_IDS);
        throw createError({
          statusCode: 404,
          statusMessage: `Sheet key "${requestedSheetKey}" not mapped (from query "${requestedSheet}"). Available sheet keys: ${availableSheets.join(", ")}`,
        });
      }

      // Find sheet by mapped Google Sheet tab ID (gid)
      targetSheet = spreadsheetInfo.data.sheets?.find(
        (sheet) => sheet.properties?.sheetId === requestedSheetId,
      );

      if (!targetSheet) {
        // Return available sheet metadata if mapped sheet ID not found in spreadsheet
        const availableSheets =
          spreadsheetInfo.data.sheets
            ?.map((s) => `${s.properties?.title} (${s.properties?.sheetId})`)
            .filter(Boolean) || [];
        throw createError({
          statusCode: 404,
          statusMessage: `Mapped sheet ID ${requestedSheetId} for "${requestedSheet}" not found. Available sheets: ${availableSheets.join(", ")}`,
        });
      }
    } else {
      // Get the first sheet or find the sheet with gid 683750936 as default
      targetSheet =
        spreadsheetInfo.data.sheets?.find(
          (sheet) => sheet.properties?.sheetId === 683750936,
        ) || spreadsheetInfo.data.sheets?.[0];
    }

    if (!targetSheet || !targetSheet.properties?.title) {
      throw createError({
        statusCode: 404,
        statusMessage: "Target sheet not found",
      });
    }

    const sheetTitle = targetSheet.properties.title;
    const range = `${sheetTitle}!A:ZZZ`; // Use the actual sheet title

    logger.info(
      `Fetching data from sheet: "${sheetTitle}" with range: ${range}`,
    );

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      return {
        success: true,
        data: [],
        message: "No data found in the spreadsheet",
      };
    }

    // Convert rows to objects using the header row as keys
    const headers = (values[headerRowIndex] as string[]) || [];
    const data = values
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((cell) => cell !== "" && cell != null))
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });

    return {
      success: true,
      data,
      total: data.length,
      headers,
      sheetName: sheetTitle,
    };
  } catch (error) {
    logger.error("Error fetching Google Sheets data:", error);

    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error
          ? error.message
          : "Failed to fetch spreadsheet data",
    });
  }
});
