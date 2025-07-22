/**
 * Utility functions for formatting data
 */

/**
 * Format currency amount to Indonesian Rupiah format
 * @param amount - The amount to format (string or number)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: string | number): string => {
  if (!amount || amount === "") return "Rp0";

  // Handle both string and number inputs
  const numericAmount =
    typeof amount === "string"
      ? parseFloat(amount.replace(/[^\d.-]/g, "")) || 0
      : amount || 0;

  return `Rp${new Intl.NumberFormat("id-ID").format(numericAmount)}`;
};

/**
 * Format date string to Indonesian locale format
 * @param dateStr - The date string to format
 * @returns Formatted date string
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Parse numeric value from currency or numeric string
 * @param value - The value to parse
 * @returns Parsed numeric value
 */
export const parseNumericValue = (value: string): number => {
  if (!value || value === "") return 0;
  return parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
};
