<script setup lang="ts">
import { formatCurrency } from "~/utils/formatters";
import {
  buildWhatsappMessage,
  monthName,
  type MonthlyExport,
} from "~/utils/waExport";

// Meta tags
useHead({
  title: "Renjana Jasmine - Treasury Management",
  meta: [
    {
      name: "description",
      content: "Pengelolaan keuangan Perumahan Renjana dan Jasmine",
    },
    // Open Graph tags for social media sharing
    {
      property: "og:title",
      content: "Renjana Jasmine - Treasury Management",
    },
    {
      property: "og:description",
      content: "Pengelolaan keuangan Perumahan Renjana dan Jasmine",
    },
    {
      property: "og:image",
      content:
        "https://res.cloudinary.com/dpcjjs0wg/image/upload/v1753176592/meta_zpp2kt.webp",
    },
    {
      property: "og:type",
      content: "website",
    },
    // Twitter Card tags
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: "Renjana Jasmine - Treasury Management",
    },
    {
      name: "twitter:description",
      content: "Pengelolaan keuangan Perumahan Renjana dan Jasmine",
    },
    {
      name: "twitter:image",
      content:
        "https://res.cloudinary.com/dpcjjs0wg/image/upload/v1753176592/meta_zpp2kt.webp",
    },
  ],
});

const showError = () => {
  const toast = useToast();
  toast.add({
    title: "Error",
    description: "Ada kesalahan saat mengambil data",
    color: "error",
  });
};

type SheetResponse<T> = {
  headers: string[];
  sheetName: string;
  success: boolean;
  total: number;
  data: T;
};

type WebSummary = {
  Title: string;
  Saldo: string;
  Icon: string;
  "Path Detail": string;
  Theme: string;
};

const webSummaries = ref<WebSummary[]>([]);
const totalBalance = ref(0);

const {
  data: summaryData,
  pending: isSummaryLoading,
  error,
} = await useFetch<SheetResponse<WebSummary[]>>("/api/gsheet", {
  query: { sheet: "Web Summary" },
});

if (error.value) {
  showError();
} else if (summaryData.value) {
  webSummaries.value = summaryData.value.data;
  totalBalance.value = webSummaries.value.reduce((total, summary) => {
    // Parse the Saldo string to number, removing any currency formatting
    const saldoNumber = parseFloat(summary.Saldo.replace(/[^\d.-]/g, "")) || 0;
    return total + saldoNumber;
  }, 0);
}

type MonthlyRow = Record<string, string>;

const monthlySummary = ref({ date: "", pemasukan: "0", pengeluaran: "0" });

const monthlyTitle = computed(() => {
  const raw = monthlySummary.value.date;
  if (!raw) return "Ringkasan Bulan Ini";
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return `Ringkasan ${raw}`;
  return `Ringkasan ${parsed.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`;
});

const {
  data: monthlyData,
  pending: isMonthlyLoading,
  error: monthlyError,
} = await useFetch<SheetResponse<MonthlyRow[]>>("/api/gsheet", {
  query: { sheet: "Web Monthly" },
});

if (monthlyError.value) {
  showError();
} else if (monthlyData.value) {
  // Sheet layout: A1=date, C1=pemasukan, C2=pengeluaran
  // API treats row 1 as headers, row 2+ as data
  const headers = monthlyData.value.headers;
  const data = monthlyData.value.data;
  const pemasukan = headers[2] ?? "0";
  monthlySummary.value = {
    date: headers[0] || "",
    pemasukan,
    pengeluaran: data[0]?.[pemasukan] || "0",
  };
}

type FiveLatest = {
  Tanggal: string;
  Deskripsi: string;
  Jumlah: string;
  Jenis: string;
  Pos: string;
};

const fiveLatest = ref<FiveLatest[]>([]);

// Get current year consistently on both server and client
const currentYear = new Date().getFullYear();

const {
  data: historyData,
  pending: isHistoryLoading,
  error: historyError,
} = await useFetch<SheetResponse<FiveLatest[]>>("/api/gsheet", {
  query: { sheet: "Web 5 Latest" },
});

if (historyError.value) {
  showError();
} else if (historyData.value) {
  fiveLatest.value = historyData.value.data;
}

// WhatsApp export
const now = new Date();
const exportMonth = ref(now.getMonth() + 1);
const exportYear = ref(currentYear);
// Months after the current one can't be exported yet
const monthOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    label: monthName(index + 1),
    value: index + 1,
    disabled:
      exportYear.value === currentYear && index + 1 > now.getMonth() + 1,
  })),
);
const yearOptions = Array.from(
  { length: currentYear - 2023 + 1 },
  (_, index) => ({
    label: String(currentYear - index),
    value: currentYear - index,
  }),
);

const waMessage = ref("");
const isExporting = ref(false);

const isFutureExport = computed(
  () =>
    exportYear.value * 12 + exportMonth.value >
    currentYear * 12 + now.getMonth() + 1,
);

const generateWaMessage = async () => {
  if (isFutureExport.value) {
    useToast().add({
      title: "Bulan belum berjalan",
      description: "Pilih bulan ini atau bulan sebelumnya",
      color: "warning",
    });
    return;
  }
  isExporting.value = true;
  try {
    const data = await $fetch<MonthlyExport>("/api/monthly-export", {
      query: { month: exportMonth.value, year: exportYear.value },
    });
    waMessage.value = buildWhatsappMessage(data, window.location.origin);
  } catch {
    showError();
  } finally {
    isExporting.value = false;
  }
};

// Reset the preview when the period changes so it never mismatches the picker
watch([exportMonth, exportYear], () => {
  waMessage.value = "";
});

const waShareLink = computed(
  () => `https://wa.me/?text=${encodeURIComponent(waMessage.value)}`,
);

const copyWaMessage = async () => {
  const toast = useToast();
  try {
    await navigator.clipboard.writeText(waMessage.value);
    toast.add({ title: "Pesan disalin", color: "success" });
  } catch {
    toast.add({
      title: "Gagal menyalin",
      description: "Silakan salin pesan secara manual",
      color: "error",
    });
  }
};
</script>

<template>
  <div class="min-h-screen">
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-4 px-3 sm:py-6 sm:px-4 lg:px-6">
      <!-- Hero Section -->
      <div
        class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 lg:gap-0 mb-6 sm:mb-8"
      >
        <div class="flex-1">
          <h1
            class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            Perum Renjana dan Jasmine
          </h1>
          <p
            class="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg"
          >
            Monitoring kas dan iuran warga Perumahan Renjana dan Jasmine.
          </p>
        </div>

        <div
          class="flex justify-between lg:flex-col items-start lg:items-end text-left lg:text-right gap-1"
        >
          <p
            class="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 pt-2 lg:pt-0"
          >
            Total Saldo
          </p>
          <h2
            class="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400"
          >
            {{
              isSummaryLoading
                ? "Menghitung..."
                : `${formatCurrency(totalBalance)}`
            }}
          </h2>
        </div>
      </div>

      <!-- Monthly Summary -->
      <UCard class="mb-5 sm:mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {{ monthlyTitle }}
            </h3>
            <UIcon
              name="i-mdi-calendar-month"
              class="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400"
            />
          </div>
        </template>

        <USkeleton v-if="isMonthlyLoading" class="w-full h-[80px]" />
        <div v-else class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Pemasukan
            </p>
            <p class="text-xl font-bold text-green-600 dark:text-green-400">
              {{ formatCurrency(monthlySummary.pemasukan) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Pengeluaran
            </p>
            <p class="text-xl font-bold text-red-600 dark:text-red-400">
              {{ formatCurrency(monthlySummary.pengeluaran) }}
            </p>
          </div>
        </div>

        <template #footer>
          <NuxtLink to="/ringkasan-bulan">
            <UButton
              variant="outline"
              block
              size="lg"
              trailing-icon="i-mdi-arrow-right"
            >
              Lihat Rincian Bulan Ini
            </UButton>
          </NuxtLink>
        </template>
      </UCard>

      <!-- Kas Cards -->
      <div class="grid grid-cols-1 mb-5">
        <HomeCard
          title="Monitoring Kas"
          icon="i-mdi-security-camera"
          :show-data="false"
          detail-link="/monitor-pembayaran"
          theme="red"
          card-class="sm:col-span-2 lg:col-span-1"
        >
          <p class="text-gray-500 dark:text-gray-400 text-sm h-[76px]">
            Pantau iuran anda maupun warga lainnya dengan mudah. Data dari tahun
            <span class="font-semibold">2023</span> hingga
            <span class="font-semibold">{{ currentYear }}</span
            >.
          </p>
        </HomeCard>
      </div>

      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
      >
        <template v-if="isSummaryLoading">
          <USkeleton
            v-for="count in 3"
            :key="`skeleton-${count}`"
            class="w-[290px] h-[250px]"
          />
        </template>

        <HomeCard
          v-for="summary in webSummaries"
          v-else
          :key="summary.Title"
          :title="summary.Title"
          :balance="summary.Saldo"
          :icon="`i-mdi-${summary.Icon}`"
          :detail-link="summary['Path Detail']"
          :theme="summary.Theme as any"
          card-class="sm:col-span-2 lg:col-span-1"
        />
      </div>

      <!-- Latest Transactions Timeline -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Transaksi Terakhir
            </h3>
            <UIcon
              name="i-mdi-clock-outline"
              class="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-2 sm:space-y-4">
          <USkeleton v-if="isHistoryLoading" class="w-full h-[500px]" />
          <LatestTransactionItem
            v-for="(transaction, index) in fiveLatest"
            v-else
            :key="index"
            :transaction="transaction"
          />
        </div>

        <template #footer>
          <NuxtLink to="/kas-umum">
            <UButton variant="solid" block size="lg">
              Lihat Semua Transaksi
            </UButton>
          </NuxtLink>
        </template>
      </UCard>

      <!-- WhatsApp Export -->
      <UCard class="mt-5 sm:mt-6">
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Export ke WhatsApp
            </h3>
            <UIcon
              name="i-mdi-whatsapp"
              class="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Pilih bulan dan tahun, lalu buat pesan rekap arus kas untuk
            dibagikan ke grup warga.
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <USelect
              v-model="exportMonth"
              :items="monthOptions"
              icon="i-mdi-calendar-month"
              class="w-full sm:w-48"
            />
            <USelect
              v-model="exportYear"
              :items="yearOptions"
              class="w-full sm:w-32"
            />
            <UButton
              icon="i-mdi-message-text-outline"
              :loading="isExporting"
              class="justify-center"
              @click="generateWaMessage"
            >
              Buat Pesan
            </UButton>
          </div>

          <UTextarea
            v-if="waMessage"
            v-model="waMessage"
            :rows="14"
            autoresize
            :maxrows="24"
            class="w-full font-mono"
          />
        </div>

        <template v-if="waMessage" #footer>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UButton
              variant="outline"
              block
              size="lg"
              icon="i-mdi-content-copy"
              @click="copyWaMessage"
            >
              Salin Pesan
            </UButton>
            <UButton
              :to="waShareLink"
              target="_blank"
              color="success"
              block
              size="lg"
              icon="i-mdi-whatsapp"
            >
              Kirim ke WhatsApp
            </UButton>
          </div>
        </template>
      </UCard>
    </main>
  </div>
</template>
