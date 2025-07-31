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
  startPembayaran?: string; // Format: "YYYY/M" (e.g., "2023/1", "2024/11")
  payment: Record<string, string>; // Flat structure with column keys like "2023/1 Jan (tgl)", "2023/1 Jan (jml)"
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
const sortBy = ref("default");

// Get current year for consistent SSR/client rendering
const currentYear = new Date().getFullYear();

// Parse raw data into structured format
const parseResidentData = (rawData: MonitoringKas[]): ParsedResident[] => {
  if (rawData.length === 0) return [];

  // Get all column headers from the first resident
  const sampleResident = rawData[0];
  if (!sampleResident) return [];

  const allColumns = Object.keys(sampleResident);

  return rawData.map((resident, index) => {
    // Create a more reliable ID - use No if available, otherwise use index + name combination
    const id =
      resident.No && resident.No.toString().trim() !== ""
        ? resident.No.toString()
        : `${index}-${resident["Nama Warga"]?.replace(/\s+/g, "-").toLowerCase() || "unknown"}`;

    const parsed: ParsedResident = {
      id: id,
      name: resident["Nama Warga"],
      perumahan: resident.Perumahan,
      nomor: resident["Nomor Rumah"],
      startPembayaran: resident["Start Pembayaran"] || "",
      payment: {},
    };

    // Parse payment columns dynamically - new flat structure
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

      // Store all payment columns directly as they come from spreadsheet
      // New format: "2023/1 Jan (tgl)", "2023/1 Jan (jml)", "2023/13 Rapat RT (tgl)", etc.
      parsed.payment[column] = resident[column] || "";
    });

    return parsed;
  });
};

// Overlay composable for programmatic modal
const overlay = useOverlay();
const modal = overlay.create(LazyResidentDetailModal);

// Router for URL management
const route = useRoute();

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

const sortOptions = computed(() => [
  { label: "Urutan Default", value: "default" },
  { label: "Tunggakan Terbanyak", value: "tunggakan" },
]);

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

  // Apply sorting
  if (sortBy.value === "tunggakan") {
    filtered = [...filtered].sort((a, b) => {
      // Always put '(Kosong)' at the bottom
      const aKosong = a.name.includes("(Kosong)");
      const bKosong = b.name.includes("(Kosong)");
      if (aKosong && !bKosong) return 1;
      if (!aKosong && bKosong) return -1;
      if (aKosong && bKosong) return 0;
      // Sort by unpaid amount in descending order (highest unpaid first)
      const summaryA = getPaymentSummary(a);
      const summaryB = getPaymentSummary(b);
      return summaryB.unpaid - summaryA.unpaid;
    });
  } else {
    // Default sort: keep original order, but move '(Kosong)' to bottom
    filtered = [...filtered].sort((a, b) => {
      const aKosong = a.name.includes("(Kosong)");
      const bKosong = b.name.includes("(Kosong)");
      if (aKosong && !bKosong) return 1;
      if (!aKosong && bKosong) return -1;
      return 0;
    });
  }

  return filtered;
});

// Helper functions
// Helper functions (removed old unused functions - using simplified new format)

// Parse start payment period (e.g., "2023 Jan") to get year and month
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

// Remove old functions - using simplified structure for monitor page
// Payment details are handled in ResidentDetailModal component

// Get color class for resident name based on payment status
const getResidentNameColor = (resident: ParsedResident): string => {
  // Skip color logic for empty residents
  if (resident.name.includes("(Kosong)")) {
    return "text-gray-900 dark:text-gray-100";
  }

  const summary = getPaymentSummary(resident);

  // If no payments expected, use default color
  if (summary.total === 0) {
    return "text-gray-900 dark:text-gray-100";
  }

  const difference = summary.total - summary.paid;

  // Determine color based on difference
  if (difference <= 3) {
    // 0-3 months behind: White (default)
    return "text-gray-900 dark:text-gray-100";
  } else if (difference <= 6) {
    // 4-6 months behind: Warning (yellow/orange)
    return "text-orange-600 dark:text-orange-400";
  } else {
    // 7+ months behind: Danger (red)
    return "text-rose-600 dark:text-rose-400";
  }
};

const getPaymentSummary = (resident: ParsedResident) => {
  let paid = 0;
  let total = 0;

  const startPeriod = parseStartPeriod(resident.startPembayaran);

  // Helper function to check if payment amount is valid
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

// Removed old _getPaymentHistory function - payment history is handled in ResidentDetailModal

const selectResident = async (resident: ParsedResident) => {
  // Update URL with resident ID using history.replaceState (client-side only)
  if (import.meta.client) {
    const url = new URL(window.location.href);
    url.searchParams.set("detail", String(resident.id)); // Ensure it's a string
    window.history.replaceState({}, "", url.toString());
  }

  // Open modal
  const instance = modal.open({
    resident: resident,
  });

  // Wait for modal to close and then clean up URL
  try {
    await instance.result;
  } finally {
    // Remove detail query parameter when modal closes (client-side only)
    if (import.meta.client) {
      const urlClean = new URL(window.location.href);
      urlClean.searchParams.delete("detail");
      window.history.replaceState({}, "", urlClean.toString());
    }
  }
};

// Watch for URL changes and auto-open modal if detail parameter exists
watch(
  () => route.query.detail,
  async (detailId) => {
    if (detailId && parsedResidents.length > 0) {
      const resident = parsedResidents.find((r) => r.id === detailId);
      if (resident) {
        const instance = modal.open({
          resident: resident,
        });

        // Wait for modal to close and then clean up URL
        try {
          await instance.result;
        } finally {
          // Remove detail query parameter when modal closes (client-side only)
          if (import.meta.client) {
            const urlClean = new URL(window.location.href);
            urlClean.searchParams.delete("detail");
            window.history.replaceState({}, "", urlClean.toString());
          }
        }
      }
    }
  },
  { immediate: true },
);

// Also watch for when parsedResidents data becomes available
watch(
  () => parsedResidents.length,
  () => {
    const detailId = route.query.detail;
    if (detailId && parsedResidents.length > 0) {
      const resident = parsedResidents.find((r) => r.id === detailId);
      if (resident) {
        nextTick(async () => {
          const instance = modal.open({
            resident: resident,
          });

          // Wait for modal to close and then clean up URL
          try {
            await instance.result;
          } finally {
            // Remove detail query parameter when modal closes (client-side only)
            if (import.meta.client) {
              const urlClean = new URL(window.location.href);
              urlClean.searchParams.delete("detail");
              window.history.replaceState({}, "", urlClean.toString());
            }
          }
        });
      }
    }
  },
);
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
          {{ currentYear }}
        </p>
        <p>
          Gunakan fitur pencarian, contoh: "Jalu" atau "13", untuk menemukan
          data warga
        </p>
      </div>

      <!-- Search and Filter -->
      <UCard class="mb-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <UInput
              v-model="searchQuery"
              class="w-full"
              placeholder="Cari nama warga atau nomor rumah..."
              icon="i-mdi-magnify"
            />
          </div>
          <div class="flex flex-col sm:flex-row gap-4 sm:gap-2">
            <USelect
              v-model="selectedPerumahan"
              :items="perumahanOptions"
              placeholder="Filter Perumahan"
              class="w-full sm:w-48"
            />
            <USelect
              v-model="sortBy"
              :items="sortOptions"
              placeholder="Urutkan"
              class="w-full sm:w-40"
            />
          </div>
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
        icon="i-mdi-alert-circle"
      />

      <!-- Resident List -->
      <div v-else class="space-y-3 sm:space-y-4">
        <UCard
          v-for="resident in filteredResidents"
          :key="resident.id"
          :class="[
            resident.name.includes('(Kosong)')
              ? 'cursor-default'
              : 'cursor-pointer hover:shadow-md transition-shadow duration-200',
          ]"
          @click="
            !resident.name.includes('(Kosong)')
              ? selectResident(resident)
              : null
          "
        >
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div class="flex-1 min-w-0">
              <h3
                :class="[
                  'font-semibold text-base sm:text-lg truncate',
                  getResidentNameColor(resident),
                ]"
              >
                {{ resident.name }}
              </h3>
              <div
                class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1"
              >
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ resident.perumahan }} - No. {{ resident.nomor }}
                </p>
              </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-3">
              <div
                v-if="
                  !resident.name.includes('(Kosong)') &&
                  getPaymentSummary(resident).unpaid > 0
                "
                class="flex-1 sm:flex-none"
              >
                <div class="flex items-center justify-between sm:block">
                  <div
                    class="text-sm sm:text-right font-medium"
                    :class="getResidentNameColor(resident)"
                  >
                    Belum bayar {{ getPaymentSummary(resident).unpaid }} bulan
                  </div>
                </div>
              </div>
              <div v-else class="w-1 h-1" />
              <UIcon
                v-if="!resident.name.includes('(Kosong)')"
                name="i-mdi-chevron-right"
                class="w-5 h-5 text-gray-400 flex-shrink-0"
              />
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
