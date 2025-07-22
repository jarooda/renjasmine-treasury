<script setup lang="ts">
import { formatCurrency } from "~/utils/formatters";

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

const webSummaries = reactive<WebSummary[]>([]);
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
  webSummaries.splice(0, webSummaries.length, ...summaryData.value.data);
  totalBalance.value = webSummaries.reduce((total, summary) => {
    // Parse the Saldo string to number, removing any currency formatting
    const saldoNumber = parseFloat(summary.Saldo.replace(/[^\d.-]/g, "")) || 0;
    return total + saldoNumber;
  }, 0);
}

type FiveLatest = {
  Nomor: string;
  Tanggal: string;
  Uraian: string;
  Nama: string;
  "Nomor Rumah": string;
  Kategori: string;
  Masuk: string;
  Keluar: string;
  Saldo: string;
};

const fiveLatest = reactive<FiveLatest[]>([]);

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
  fiveLatest.splice(0, fiveLatest.length, ...historyData.value.data);
}
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
            Monitoring kas dan iuran warga
          </p>
        </div>

        <div
          class="flex justify-between lg:flex-col items-start lg:items-end text-left lg:text-right gap-1"
        >
          <p
            class="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 pt-2 lg:pt-0"
          >
            Total Saldo
          </p>
          <h2
            class="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400"
          >
            {{
              isSummaryLoading
                ? "Menghitung..."
                : `${formatCurrency(totalBalance)}`
            }}
          </h2>
        </div>
      </div>

      <!-- Kas Cards -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
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
          :theme="summary.Theme"
          card-class="sm:col-span-2 lg:col-span-1"
        />

        <HomeCard
          title="Monitoring Kas"
          icon="i-mdi-security-camera"
          :show-data="false"
          detail-link="/monitor-pembayaran"
          theme="red"
          card-class="sm:col-span-2 lg:col-span-1"
        >
          <p class="text-gray-500 dark:text-gray-400 text-sm h-[76px]">
            Monitor pembayaran kas warga dari tahun
            <span class="font-semibold">2023</span> hingga
            <span class="font-semibold">{{ new Date().getFullYear() }}</span
            >.
          </p>
        </HomeCard>
      </div>

      <!-- Latest Transactions Timeline -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              5 Transaksi Terakhir
            </h3>
            <UIcon
              name="i-mdi-clock-outline"
              class="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-2 sm:space-y-4">
          <USkeleton v-if="isHistoryLoading" class="w-full h-[500px]" />
          <TransactionItem
            v-for="(transaction, index) in fiveLatest"
            v-else
            :key="index"
            :transaction="transaction"
          />
        </div>

        <template #footer>
          <NuxtLink to="/kas-umum">
            <UButton variant="solid" block size="sm">
              Lihat Semua Transaksi
            </UButton>
          </NuxtLink>
        </template>
      </UCard>
    </main>
  </div>
</template>
