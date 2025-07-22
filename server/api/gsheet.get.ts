import { google } from "googleapis";
import { JWT } from "google-auth-library";
import logger from "~~/server/utils/log";

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event);
    const requestedSheet = (query.sheet as string) || null;

    // Try without authentication first (for public sheets)
    let sheets;

    // Check if we have authentication credentials
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Use authentication if available
      try {
        const credentials = JSON.parse(serviceAccountKey);
        const auth = new JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        sheets = google.sheets({ version: "v4", auth: auth as JWT });
        logger.info("Using authenticated access");
      } catch (authError) {
        logger.error("Authentication failed, trying public access:", authError);
        sheets = google.sheets({ version: "v4" });
      }
    } else {
      // Try without authentication (for public sheets)
      sheets = google.sheets({ version: "v4" });
      logger.warn("No service account key found, trying public access");
    }

    // Your spreadsheet ID
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    // First, get the spreadsheet metadata to find the correct sheet name
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    let targetSheet;

    if (requestedSheet) {
      // Find sheet by name
      targetSheet = spreadsheetInfo.data.sheets?.find(
        (sheet) =>
          sheet.properties?.title?.toLowerCase() ===
          requestedSheet.toLowerCase(),
      );

      if (!targetSheet) {
        // Return available sheets if requested sheet not found
        const availableSheets =
          spreadsheetInfo.data.sheets
            ?.map((s) => s.properties?.title)
            .filter(Boolean) || [];
        throw createError({
          statusCode: 404,
          statusMessage: `Sheet "${requestedSheet}" not found. Available sheets: ${availableSheets.join(", ")}`,
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

    // Convert rows to objects using first row as headers
    const headers = values[0] as string[];
    const data = values.slice(1).map((row) => {
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
