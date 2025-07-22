<script setup lang="ts">
import { LazyResidentDetailModal } from "#components";

// Meta tags
useHead({
  title: "Monitor Pembayaran Kas - Treasury Management",
  meta: [
    {
      name: "description",
      content:
        "Monitor status pembayaran kas warga dari tahun 2023 hingga sekarang",
    },
  ],
});

type MonitoringKas = {
  No: string;
  "Nama Warga": string;
  Perumahan: string;
  "Nomor Rumah": string;
  [key: string]: string; // For dynamic month columns
};

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
  payment: Record<string, unknown> & {
    Rapat?: Record<string, Record<string, string>>;
  }; // Dynamic structure based on column headers
};

type SheetResponse<T> = {
  headers: string[];
  sheetName: string;
  success: boolean;
  total: number;
  data: T;
};

// Reactive data
const residents = reactive<MonitoringKas[]>([]);
const parsedResidents = reactive<ParsedResident[]>([]);
const searchQuery = ref("");
const selectedPerumahan = ref("all");

// Parse raw data into structured format
const parseResidentData = (rawData: MonitoringKas[]): ParsedResident[] => {
  if (rawData.length === 0) return [];

  // Get all column headers from the first resident
  const sampleResident = rawData[0];
  if (!sampleResident) return [];

  const allColumns = Object.keys(sampleResident);

  return rawData.map((resident) => {
    const parsed: ParsedResident = {
      id: resident.No,
      name: resident["Nama Warga"],
      perumahan: resident.Perumahan,
      nomor: resident["Nomor Rumah"],
      startPembayaran: resident["Start Pembayaran"] || "",
      payment: {},
    };

    // Parse payment columns dynamically
    allColumns.forEach((column) => {
      // Skip basic info columns
      if (
        [
          "No",
          "Nama Warga",
          "Perumahan",
          "Nomor Rumah",
          "Start Pembayaran",
        ].includes(column)
      ) {
        return;
      }

      // Handle Rapat RT columns separately (now with year prefix)
      if (column.includes("Rapat RT")) {
        const rapatMatch = column.match(/^(\d{4})\s+Rapat RT\s+\((\w+)\)$/);
        if (rapatMatch) {
          const [, yearStr, typeStr] = rapatMatch;

          if (!yearStr || !typeStr) return;

          if (!parsed.payment.Rapat) {
            parsed.payment.Rapat = {};
          }
          if (!parsed.payment.Rapat[yearStr]) {
            parsed.payment.Rapat[yearStr] = {};
          }

          parsed.payment.Rapat[yearStr][typeStr] = resident[column] || "";
        }
        return;
      }

      // Parse year-month columns (e.g., "2023 Jan (tgl)", "2024 Feb (jml)")
      const yearMonthMatch = column.match(/^(\d{4})\s+(\w+)\s+\((\w+)\)$/);
      if (yearMonthMatch) {
        const [, yearStr, monthStr, typeStr] = yearMonthMatch;

        if (!yearStr || !monthStr || !typeStr) return;

        // Initialize year if not exists
        if (!parsed.payment[yearStr]) {
          parsed.payment[yearStr] = {};
        }

        const yearPayments = parsed.payment[yearStr] as Record<
          string,
          Record<string, string>
        >;

        // Initialize month if not exists
        if (!yearPayments[monthStr]) {
          yearPayments[monthStr] = {};
        }

        // Set the value
        yearPayments[monthStr][typeStr] = resident[column] || "";
      }
    });

    return parsed;
  });
};

// Overlay composable for programmatic modal
const overlay = useOverlay();
const modal = overlay.create(LazyResidentDetailModal);

// Show error toast
const showError = () => {
  const toast = useToast();
  toast.add({
    title: "Error",
    description: "Ada kesalahan saat mengambil data pembayaran kas",
    color: "error",
  });
};

// Fetch data from API
const {
  data: monitoringData,
  pending: isLoading,
  error,
} = await useFetch<SheetResponse<MonitoringKas[]>>("/api/gsheet", {
  query: { sheet: "Monitoring Kas 2023" },
});

if (error.value) {
  console.error("Error fetching monitoring data:", error.value);
  showError();
} else if (monitoringData.value) {
  residents.splice(0, residents.length, ...monitoringData.value.data);
  const parsed = parseResidentData(monitoringData.value.data);
  parsedResidents.splice(0, parsedResidents.length, ...parsed);
}

// Computed properties
const perumahanOptions = computed(() => {
  const perumahanSet = new Set(parsedResidents.map((r) => r.perumahan));
  return [
    { label: "Semua Perumahan", value: "all" },
    ...Array.from(perumahanSet).map((p) => ({ label: p, value: p })),
  ];
});

const filteredResidents = computed(() => {
  let filtered = parsedResidents;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (resident) =>
        resident.name.toLowerCase().includes(query) ||
        resident.nomor.toLowerCase().includes(query),
    );
  }

  if (selectedPerumahan.value && selectedPerumahan.value !== "all") {
    filtered = filtered.filter(
      (resident) => resident.perumahan === selectedPerumahan.value,
    );
  }

  return filtered;
});

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

const _getPaymentHistory = (resident: ParsedResident) => {
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
  const rapatCategory = resident.payment.Rapat as
    | Record<string, Record<string, string>>
    | undefined;
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

const selectResident = async (resident: ParsedResident) => {
  const instance = modal.open({
    resident: resident,
  });

  // Wait for modal to close
  await instance.result;
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto py-4 px-3 sm:py-6 sm:px-4 lg:px-6">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          <UIcon name="i-mdi-arrow-left" class="w-4 h-4 mr-2" />
          Kembali ke Dashboard
        </NuxtLink>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1
          class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2"
        >
          Monitor Pembayaran Kas
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Pantau status pembayaran kas warga dari tahun 2023 hingga
          {{ new Date().getFullYear() }}
        </p>
      </div>

      <!-- Search and Filter -->
      <UCard class="mb-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <UInput
              v-model="searchQuery"
              placeholder="Cari nama warga atau nomor rumah..."
              icon="i-mdi-magnify"
            />
          </div>
          <USelect
            v-model="selectedPerumahan"
            :items="perumahanOptions"
            placeholder="Pilih Perumahan"
            class="w-full sm:w-48"
          />
        </div>
      </UCard>

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <USkeleton v-for="i in 5" :key="i" class="h-20" />
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        title="Error"
        description="Gagal memuat data pembayaran kas"
        class="mb-6"
      />

      <!-- Resident List -->
      <div v-else class="space-y-4">
        <UCard
          v-for="resident in filteredResidents"
          :key="resident.id"
          class="cursor-pointer hover:shadow-md transition-shadow duration-200"
          @click="selectResident(resident)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                {{ resident.name }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ resident.perumahan }} - Rumah No. {{ resident.nomor }}
                <span
                  v-if="resident.startPembayaran"
                  class="inline-block ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded"
                >
                  Mulai: {{ resident.startPembayaran }}
                </span>
              </p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div
                  class="text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  {{ getPaymentSummary(resident).paid }}/{{
                    getPaymentSummary(resident).total
                  }}
                  bulan
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{
                    (
                      (getPaymentSummary(resident).paid /
                        getPaymentSummary(resident).total) *
                      100
                    ).toFixed(0)
                  }}% terbayar
                </div>
              </div>
              <UIcon name="i-mdi-chevron-right" class="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- No Results -->
      <div
        v-if="!isLoading && !error && filteredResidents.length === 0"
        class="text-center py-12"
      >
        <UIcon
          name="i-mdi-account-search"
          class="w-16 h-16 text-gray-400 mx-auto mb-4"
        />
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Tidak ada hasil
        </h3>
        <p class="text-gray-600 dark:text-gray-400">
          Tidak ditemukan warga yang sesuai dengan pencarian Anda.
        </p>
      </div>
    </div>
  </div>
</template>
