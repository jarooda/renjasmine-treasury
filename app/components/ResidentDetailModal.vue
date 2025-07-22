<script setup lang="ts">
import { formatCurrency } from "~/utils/formatters";

type _PaymentMonth = {
  tgl: string;
  jml: string;
};

type ParsedResident = {
  id: string;
  name: string;
  perumahan: string;
  nomor: string;
  startPembayaran?: string; // New field for start payment period
  payment: Record<string, unknown>; // Dynamic structure based on column headers
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

const hasPaymentFields = (
  obj: unknown,
): obj is { tgl?: string; jml?: string } => {
  return obj !== null && typeof obj === "object";
};

// Parse start payment period (e.g., "2023 Jan") to get year and month
const parseStartPeriod = (startPembayaran?: string) => {
  if (!startPembayaran || !startPembayaran.trim()) return null;

  const match = startPembayaran.trim().match(/^(\d{4})\s+(\w+)$/);
  if (!match) return null;

  const [, yearStr, monthStr] = match;
  if (!yearStr || !monthStr) return null;

  return { year: parseInt(yearStr), month: monthStr };
};

// Get month index for comparison (Jan = 1, Feb = 2, etc.)
const getMonthIndex = (month: string): number => {
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
  return months.indexOf(month) + 1;
};

// Check if a payment period should be counted based on start date and current date
const shouldCountPayment = (
  year: string,
  month: string,
  startPeriod: { year: number; month: string } | null,
): boolean => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

  const paymentYear = parseInt(year);
  const paymentMonthIndex = getMonthIndex(month);

  // Don't count future payments (after current month)
  if (paymentYear > currentYear) return false;
  if (paymentYear === currentYear && paymentMonthIndex > currentMonthIndex)
    return false;

  // If no start period, count all payments up to current month
  if (!startPeriod) return true;

  const startMonthIndex = getMonthIndex(startPeriod.month);

  // If payment year is after start year, count it
  if (paymentYear > startPeriod.year) return true;

  // If payment year is before start year, don't count it
  if (paymentYear < startPeriod.year) return false;

  // Same year: check if payment month is >= start month
  return paymentMonthIndex >= startMonthIndex;
};

// Check if Rapat RT should be counted based on start date
const shouldCountRapatRT = (
  rapatYear: string,
  startPeriod: { year: number; month: string } | null,
): boolean => {
  if (!startPeriod) return true; // If no start period, count all Rapat RT

  const rapatYearNum = parseInt(rapatYear);

  // Only count Rapat RT if it's from the start year or later
  return rapatYearNum >= startPeriod.year;
};

const getPaymentSummary = (resident: ParsedResident) => {
  let paid = 0;
  let total = 0;

  const startPeriod = parseStartPeriod(resident.startPembayaran);

  // Iterate through all payment categories
  Object.entries(resident.payment).forEach(([categoryKey, categoryValue]) => {
    // Skip Rapat RT from counting - exclude from payment summary
    if (categoryKey === "Rapat") {
      return;
    }

    if (
      categoryValue &&
      typeof categoryValue === "object" &&
      /^\d{4}$/.test(categoryKey)
    ) {
      // Handle year categories (2023, 2024, 2025, etc.)
      Object.entries(categoryValue).forEach(([monthKey, monthValue]) => {
        if (hasPaymentFields(monthValue)) {
          // Only count payments from start date onwards
          if (shouldCountPayment(categoryKey, monthKey, startPeriod)) {
            total++;
            if (isValidPayment(monthValue.jml)) {
              paid++;
            }
          }
        }
      });
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
    shouldCount: boolean; // New field to indicate if payment should be counted
  }> = [];

  const startPeriod = parseStartPeriod(resident.startPembayaran);

  // Collect all year-month payments
  const yearEntries = Object.entries(resident.payment)
    .filter(([key]) => /^\d{4}$/.test(key)) // Only year keys
    .sort(([a], [b]) => parseInt(b) - parseInt(a)); // Sort years descending

  yearEntries.forEach(([year, yearValue]) => {
    if (yearValue && typeof yearValue === "object") {
      // Sort months to display in reverse chronological order within the year
      const monthOrder = [
        "Des",
        "Nov",
        "Okt",
        "Sep",
        "Ags",
        "Jul",
        "Jun",
        "Mei",
        "Apr",
        "Mar",
        "Feb",
        "Jan",
      ];
      const monthEntries = Object.entries(yearValue).sort(([a], [b]) => {
        const indexA = monthOrder.indexOf(a);
        const indexB = monthOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });

      monthEntries.forEach(([month, monthValue]) => {
        if (hasPaymentFields(monthValue)) {
          const isPaid = isValidPayment(monthValue.jml);
          const shouldCount = shouldCountPayment(year, month, startPeriod);

          payments.push({
            period: `${month} ${year}`,
            date: monthValue.tgl || "",
            amount: monthValue.jml || "",
            isPaid,
            shouldCount,
          });
        }
      });
    }
  });

  // Add Rapat RT if exists (now with year keys)
  const rapatCategory = resident.payment.Rapat as Record<string, unknown>;
  if (rapatCategory && typeof rapatCategory === "object") {
    Object.entries(rapatCategory).forEach(([rapatYear, rapatValue]) => {
      if (hasPaymentFields(rapatValue)) {
        const isRapatPaid = isValidPayment(rapatValue.jml);
        const shouldCount = shouldCountRapatRT(rapatYear, startPeriod);

        // Insert Rapat RT in chronological position based on year
        const yearNum = parseInt(rapatYear);
        let insertIndex = payments.findIndex((p) => {
          const match = p.period.match(/(\d{4})$/);
          if (match && match[1]) {
            const paymentYear = parseInt(match[1]);
            return paymentYear < yearNum;
          }
          return false;
        });

        if (insertIndex === -1) {
          insertIndex = payments.length;
        }

        payments.splice(insertIndex, 0, {
          period: `Rapat RT ${rapatYear}`,
          date: rapatValue.tgl || "",
          amount: rapatValue.jml || "",
          isPaid: isRapatPaid,
          shouldCount,
        });
      }
    });
  }

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
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
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
          class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
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
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{
                (
                  (getPaymentSummary(resident).paid /
                    getPaymentSummary(resident).total) *
                  100
                ).toFixed(0)
              }}%
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Persentase
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
              <strong>Mulai Pembayaran:</strong> {{ resident.startPembayaran }}
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
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                      !payment.shouldCount ? 'opacity-50' : '',
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <UIcon
                        :name="
                          payment.isPaid
                            ? 'i-mdi-check-circle'
                            : 'i-mdi-clock-outline'
                        "
                        :class="
                          payment.isPaid
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        "
                        class="w-5 h-5"
                      />
                      <div>
                        <div
                          class="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2"
                        >
                          {{ payment.period }}
                          <span
                            v-if="!payment.shouldCount"
                            class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            Tidak dihitung
                          </span>
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
                            : 'text-red-600 dark:text-red-400'
                        "
                      >
                        {{
                          payment.isPaid
                            ? formatCurrency(payment.amount)
                            : "Belum Bayar"
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
