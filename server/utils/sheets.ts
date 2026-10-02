import { google, type sheets_v4 } from "googleapis";
import logger from "~~/server/utils/log";

export const SHEET_IDS: Record<string, number> = {
  web_summary: 1179277890,
  web_monthly: 1914662507,
  monitoring_kas_2023: 484500319,
  buku_kas: 0,
  kas_rt: 456509783,
  kas_pompa_jasmine: 1130447780,
  kas_pompa_air: 1225692475,
  kas_keamanan: 1350633016,
  kas_event: 1015886599,
  web_5_latest: 725770813,
};

export const getSpreadsheetId = () => process.env.GOOGLE_SPREADSHEET_ID;

export const getSheetsClient = (): sheets_v4.Sheets => {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    // Try without authentication (for public sheets)
    logger.warn("No service account key found, trying public access");
    return google.sheets({ version: "v4" });
  }

  try {
    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    logger.info("Using authenticated access");
    return google.sheets({ version: "v4", auth });
  } catch (authError) {
    logger.error("Authentication failed, trying public access:", authError);
    return google.sheets({ version: "v4" });
  }
};
