<script setup lang="ts">
import { formatCurrency } from "~/utils/formatters";

type ParsedResident = {
  id: string;
  name: string;
  perumahan: string;
  nomor: string;
  startPembayaran?: string; // Format: "YYYY/M" (e.g., "2023/1", "2024/11")
  payment: Record<string, string>; // Flat structure with column keys like "2023/1 Jan (tgl)", "2023/1 Jan (jml)"
};

interface Props {
  resident: ParsedResident | null;
}

defineProps<Props>();
const emit = defineEmits<{ close: [boolean] }>();

// Helper functions
const isValidPayment = (amount: unknown): boolean => {
  if (!amount || typeof amount !== "string") return false;
  const cleanAmount = amount.trim();
  if (
    !cleanAmount ||
    cleanAmount === "" ||
    cleanAmount === "0" ||
    cleanAmount === "-"
  )
    return false;
  const numericValue = parseFloat(cleanAmount.replace(/[^\d.-]/g, ""));
  return !isNaN(numericValue) && numericValue > 0;
};

// Parse start payment period (e.g., "2023/1", "2024/11") to get year and month
const parseStartPeriod = (startPembayaran?: string) => {
  if (!startPembayaran || !startPembayaran.trim()) return null;

  const match = startPembayaran.trim().match(/^(\d{4})\/(\d{1,2})$/);
  if (!match) return null;

  const [, yearStr, monthStr] = match;
  if (!yearStr || !monthStr) return null;

  return { year: parseInt(yearStr), month: parseInt(monthStr) };
};

// Check if a payment period should be counted based on start date and current date
const shouldCountPayment = (
  paymentKey: string,
  startPeriod: { year: number; month: number } | null,
): boolean => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

  // Parse payment key format: "YYYY/M" where M can be 1-12 for months, or >12 for special items
  const match = paymentKey.match(/^(\d{4})\/(\d+)$/);
  if (!match) return false;

  const paymentYear = parseInt(match[1]!);
  const paymentMonth = parseInt(match[2]!);

  // For special items (month > 12), only check year and start period
  if (paymentMonth > 12) {
    // Don't count future years
    if (paymentYear > currentYear) return false;

    // If no start period, count all items up to current year
    if (!startPeriod) return paymentYear <= currentYear;

    // Only count if it's from the start year or later
    return paymentYear >= startPeriod.year;
  }

  // For regular monthly payments (month 1-12)
  // Don't count future payments (after current month)
  if (paymentYear > currentYear) return false;
  if (paymentYear === currentYear && paymentMonth > currentMonthIndex)
    return false;

  // If no start period, count all payments up to current month
  if (!startPeriod) return true;

  // If payment year is after start year, count it
  if (paymentYear > startPeriod.year) return true;

  // If payment year is before start year, don't count it
  if (paymentYear < startPeriod.year) return false;

  // Same year: check if payment month is >= start month
  return paymentMonth >= startPeriod.month;
};

// Helper function to check if payment is in future month
const isFuturePayment = (paymentKey: string): boolean => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth() + 1;

  const match = paymentKey.match(/^(\d{4})\/(\d+)$/);
  if (!match) return false;

  const paymentYear = parseInt(match[1]!);
  const paymentMonth = parseInt(match[2]!);

  // For special items (month > 12), not considered future
  if (paymentMonth > 12) return false;

  // Check if it's a future payment
  if (paymentYear > currentYear) return true;
  if (paymentYear === currentYear && paymentMonth > currentMonthIndex)
    return true;

  return false;
};

const getPaymentSummary = (resident: ParsedResident) => {
  let paid = 0;
  let total = 0;

  const startPeriod = parseStartPeriod(resident.startPembayaran);

  // Parse new column format: "YYYY/M MonthName (jml)" or "YYYY/13 Rapat RT (jml)"
  Object.entries(resident.payment).forEach(([columnKey, columnValue]) => {
    // Only process amount columns (ending with "(jml)")
    if (!columnKey.endsWith("(jml)")) return;

    // Extract the payment key (everything before " (jml)")
    const paymentKeyMatch = columnKey.match(/^(.+)\s+\(jml\)$/);
    if (!paymentKeyMatch) return;

    const paymentKey = paymentKeyMatch[1]!;

    // Skip Rapat RT from counting in summary
    if (paymentKey.includes("Rapat RT")) {
      return;
    }

    // Extract YYYY/M part from the key
    const keyMatch = paymentKey.match(/^(\d{4}\/\d+)/);
    if (!keyMatch) return;

    const periodKey = keyMatch[1]!;

    // Only count payments from start date onwards
    if (shouldCountPayment(periodKey, startPeriod)) {
      total++;
      if (isValidPayment(columnValue)) {
        paid++;
      }
    }
  });

  return {
    paid,
    unpaid: total - paid,
    total,
  };
};

const getPaymentHistory = (resident: ParsedResident) => {
  const payments: Array<{
    period: string;
    date: string;
    amount: string;
    isPaid: boolean;
    shouldCount: boolean;
    isFuture: boolean;
  }> = [];

  const startPeriod = parseStartPeriod(resident.startPembayaran);

  // Helper function to get month name from number
  const getMonthName = (monthNum: number): string => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return months[monthNum - 1] || `Month${monthNum}`;
  };

  // Collect payment data from new column format
  const paymentMap = new Map<string, { date: string; amount: string }>();

  // First pass: collect all date and amount data
  Object.entries(resident.payment).forEach(([columnKey, columnValue]) => {
    if (typeof columnValue !== "string") return;

    // Parse column format: "YYYY/M MonthName (tgl)" or "YYYY/M MonthName (jml)" or "YYYY/13 Rapat RT (tgl/jml)"
    const columnMatch = columnKey.match(/^(.+)\s+\((tgl|jml)\)$/);
    if (!columnMatch) return;

    const [, paymentKey, fieldType] = columnMatch;
    if (!paymentKey) return;

    if (!paymentMap.has(paymentKey)) {
      paymentMap.set(paymentKey, { date: "", amount: "" });
    }

    const paymentData = paymentMap.get(paymentKey)!;
    if (fieldType === "tgl") {
      paymentData.date = columnValue.trim();
    } else if (fieldType === "jml") {
      paymentData.amount = columnValue.trim();
    }
  });

  // Second pass: convert to payment history
  paymentMap.forEach((data, paymentKey) => {
    // Parse the payment key to extract period info
    const keyMatch = paymentKey.match(/^(\d{4})\/(\d+)(?:\s+(.+))?$/);
    if (!keyMatch) return;

    const [, year, monthNum, description] = keyMatch;
    const monthNumInt = parseInt(monthNum!);

    let displayPeriod: string;
    let periodKey: string;

    if (monthNumInt > 12) {
      // Special items like Rapat RT
      displayPeriod = description
        ? `${description} ${year}`
        : `Special ${year}`;
      periodKey = `${year}/${monthNum}`;
    } else {
      // Regular monthly payments
      const monthName = description || getMonthName(monthNumInt);
      displayPeriod = `${monthName} ${year}`;
      periodKey = `${year}/${monthNum}`;
    }

    const isPaid = isValidPayment(data.amount);
    const shouldCount = shouldCountPayment(periodKey, startPeriod);
    const isFuture = isFuturePayment(periodKey);

    payments.push({
      period: displayPeriod,
      date: data.date,
      amount: data.amount,
      isPaid,
      shouldCount,
      isFuture,
    });
  });

  // Sort payments by year and month (most recent first)
  payments.sort((a, b) => {
    const extractYearMonth = (period: string) => {
      if (period.includes("Rapat RT")) {
        const match = period.match(/(\d{4})$/);
        return match
          ? { year: parseInt(match[1]!), month: 13 }
          : { year: 0, month: 0 };
      }

      const match = period.match(/(\w+)\s+(\d{4})$/);
      if (!match) return { year: 0, month: 0 };

      const monthName = match[1]!;
      const year = parseInt(match[2]!);
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Ags",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const month = months.indexOf(monthName) + 1;

      return { year, month: month || 0 };
    };

    const aData = extractYearMonth(a.period);
    const bData = extractYearMonth(b.period);

    if (aData.year !== bData.year) {
      return bData.year - aData.year; // Most recent year first
    }
    return bData.month - aData.month; // Most recent month first
  });

  return payments;
};

const getGroupedPaymentHistory = (resident: ParsedResident) => {
  const payments = getPaymentHistory(resident);
  const groupedByYear = new Map<
    string,
    Array<{
      period: string;
      date: string;
      amount: string;
      isPaid: boolean;
      shouldCount: boolean;
      isFuture: boolean;
    }>
  >();

  // Group payments by year
  payments.forEach((payment) => {
    let year = "Lainnya";

    if (payment.period.includes("Rapat RT")) {
      const match = payment.period.match(/Rapat RT (\d{4})/);
      if (match) {
        year = match[1] || "Lainnya";
      }
    } else {
      const match = payment.period.match(/(\d{4})$/);
      if (match) {
        year = match[1] || "Lainnya";
      }
    }

    if (!groupedByYear.has(year)) {
      groupedByYear.set(year, []);
    }
    groupedByYear.get(year)?.push(payment);
  });

  // Convert to accordion items format
  const items = [];
  const sortedYears = Array.from(groupedByYear.keys()).sort((a, b) => {
    // Handle "Lainnya" category
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return parseInt(b) - parseInt(a); // Most recent year first
  });

  for (const year of sortedYears) {
    const yearPayments = groupedByYear.get(year) || [];

    // Calculate year summary (exclude Rapat RT from counting)
    const yearSummary = {
      paid: yearPayments.filter(
        (p) => p.isPaid && p.shouldCount && !p.period.includes("Rapat RT"),
      ).length,
      total: yearPayments.filter(
        (p) => p.shouldCount && !p.period.includes("Rapat RT"),
      ).length,
    };

    items.push({
      label: year,
      payments: yearPayments,
      yearSummary,
    });
  }

  return items;
};

// Helper function to format start payment period for display
const formatStartPeriodDisplay = (startPembayaran?: string): string => {
  if (!startPembayaran) return "";

  const parsed = parseStartPeriod(startPembayaran);
  if (!parsed) return startPembayaran;

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const monthName = months[parsed.month - 1] || `Bulan ${parsed.month}`;
  return `${monthName} ${parsed.year}`;
};
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', false), icon: 'i-mdi-close' }"
    :title="`Detail Pembayaran - ${resident?.name || ''}`"
    :description="`${resident?.perumahan || ''} - Rumah No. ${
      resident?.nomor || ''
    }`"
    :ui="{
      wrapper: 'w-full h-full sm:h-auto sm:max-w-4xl sm:my-8 sm:mx-auto',
      content: 'h-full sm:h-auto sm:max-h-[90vh] overflow-auto',
      overlay: 'sm:p-4',
    }"
  >
    <template #body>
      <div v-if="resident" class="space-y-6">
        <!-- Payment Summary -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ getPaymentSummary(resident).paid }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Terbayar</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600 dark:text-red-400">
              {{ getPaymentSummary(resident).unpaid }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Belum Bayar
            </div>
          </div>
        </div>

        <!-- Payment Timeline -->
        <div>
          <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-4">
            Riwayat Pembayaran
          </h4>
          <div
            v-if="resident.startPembayaran"
            class="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <p class="text-sm text-blue-800 dark:text-blue-200">
              <strong>Mulai Pembayaran:</strong>
              {{ formatStartPeriodDisplay(resident.startPembayaran) }}
            </p>
          </div>

          <div class="space-y-2">
            <UCollapsible
              v-for="yearGroup in getGroupedPaymentHistory(resident)"
              :key="yearGroup.label"
              class="border dark:border-gray-700 rounded-lg"
            >
              <template #default="{ open }">
                <div
                  class="flex items-center justify-between w-full px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                      >{{ yearGroup.label }}</span
                    >
                    <UBadge
                      :color="
                        yearGroup.yearSummary.paid ===
                        yearGroup.yearSummary.total
                          ? 'success'
                          : yearGroup.yearSummary.paid > 0
                            ? 'warning'
                            : 'error'
                      "
                      size="xs"
                    >
                      {{ yearGroup.yearSummary.paid }}/{{
                        yearGroup.yearSummary.total
                      }}
                    </UBadge>
                  </div>
                  <UIcon
                    name="i-heroicons-chevron-down-20-solid"
                    class="w-5 h-5 ms-auto transform transition-transform duration-200"
                    :class="[open && 'rotate-180']"
                  />
                </div>
              </template>

              <template #content>
                <div class="space-y-2 px-4 pb-3">
                  <div
                    v-for="payment in yearGroup.payments"
                    :key="payment.period"
                    class="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg"
                    :class="[
                      payment.isPaid
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : payment.isFuture || payment.shouldCount
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                      !payment.shouldCount ? 'opacity-50' : '',
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <UIcon
                        :name="
                          payment.isPaid
                            ? 'i-mdi-check-circle'
                            : payment.isFuture || payment.shouldCount
                              ? 'i-mdi-clock-outline'
                              : 'i-mdi-minus-circle-outline'
                        "
                        :class="
                          payment.isPaid
                            ? 'text-green-600 dark:text-green-400'
                            : payment.isFuture || payment.shouldCount
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-400 dark:text-gray-500'
                        "
                        class="w-5 h-5"
                      />
                      <div>
                        <div
                          class="font-medium text-gray-900 dark:text-gray-100"
                        >
                          {{ payment.period }}
                        </div>
                        <div
                          v-if="payment.isPaid && payment.date"
                          class="text-sm text-gray-600 dark:text-gray-400"
                        >
                          {{ payment.date }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div
                        class="font-medium"
                        :class="
                          payment.isPaid
                            ? 'text-green-600 dark:text-green-400'
                            : payment.isFuture || payment.shouldCount
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400'
                        "
                      >
                        {{
                          payment.isPaid
                            ? formatCurrency(payment.amount)
                            : payment.isFuture || payment.shouldCount
                              ? "Belum Bayar"
                              : "Tidak Masuk Hitungan"
                        }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </UCollapsible>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<!--
 * Updated ResidentDetailModal to handle new column format:
 * 
 * Old format:
 * - startPembayaran: "2023 Jan"
 * - payment structure: nested year/month objects
 * 
 * New format:
 * - startPembayaran: "2023/1", "2024/11", etc.
 * - column names: "2023/1 Jan (tgl)", "2023/1 Jan (jml)", "2023/13 Rapat RT (tgl)", "2023/13 Rapat RT (jml)"
 * - payment structure: flat with column keys as properties
 * 
 * Key changes:
 * 1. parseStartPeriod now handles "YYYY/M" format
 * 2. shouldCountPayment works with period keys like "2023/1" or "2023/13"
 * 3. Payment data parsing handles flat column structure
 * 4. Numbers >12 in month position indicate special items (like Rapat RT)
 -->
