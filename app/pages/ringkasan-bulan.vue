<script setup lang="ts">
import {
  formatCurrency,
  formatDate,
  parseNumericValue,
} from "~/utils/formatters";

useHead({
  title: "Ringkasan Bulan - Treasury Management",
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

type MonthlyDetail = {
  Tanggal: string;
  Deskripsi: string;
  Jumlah: string;
  Jenis: string;
  Pos: string;
};

const monthlyDetails = reactive<MonthlyDetail[]>([]);

const {
  data: detailResponse,
  pending: isLoading,
  error,
} = await useFetch<SheetResponse<MonthlyDetail[]>>("/api/gsheet", {
  // Same sheet as the monthly summary; detail table starts at A5 with
  // headers on row 4 (Tanggal, Deskripsi, Jumlah, Jenis, Pos).
  query: { sheet: "Web Monthly", headerRow: 4 },
  transform: (data) => {
    // Show the latest transactions first
    return { ...data, data: data.data.reverse() };
  },
});

if (error.value) {
  showError();
} else if (detailResponse.value) {
  monthlyDetails.splice(0, monthlyDetails.length, ...detailResponse.value.data);
}

const isIncome = (jenis: string) => jenis === "In";

// Sort presets
const sortOptions = [
  { label: "Default (Sesuai Sheet)", value: "default" },
  { label: "Pengeluaran Terbanyak", value: "expense" },
  { label: "Pemasukan Terbanyak", value: "income" },
];
const sortBy = ref<"default" | "expense" | "income">("default");

const sortedDetails = computed(() => {
  if (sortBy.value === "default") return monthlyDetails;
  const wantIncome = sortBy.value === "income";
  return [...monthlyDetails].sort((a, b) => {
    const aMatch = isIncome(a.Jenis) === wantIncome;
    const bMatch = isIncome(b.Jenis) === wantIncome;
    // Bring the targeted Jenis to the top, then sort by amount (largest first)
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return parseNumericValue(b.Jumlah) - parseNumericValue(a.Jumlah);
  });
});
</script>

<template>
  <div class="min-h-screen">
    <div class="max-w-7xl mx-auto py-4 px-3 sm:py-6 sm:px-4 lg:px-6">
      <!-- Back Navigation -->
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
      <div class="mb-6">
        <h1
          class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2"
        >
          Ringkasan Bulan Ini
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Rincian transaksi pemasukan dan pengeluaran bulan ini
        </p>
      </div>

      <!-- Data Table Card -->
      <UCard>
        <template #header>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Detail Transaksi
            </h3>
            <div class="flex items-center gap-3">
              <USelect
                v-model="sortBy"
                :items="sortOptions"
                icon="i-mdi-sort"
                class="w-56"
              />
              <div
                class="hidden sm:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
              >
                <UIcon name="i-mdi-table" class="w-4 h-4" />
                <span>{{ monthlyDetails.length }} transaksi</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Data Table - Desktop -->
        <div class="hidden lg:block overflow-x-auto">
          <table
            class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          >
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Tanggal
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Deskripsi
                </th>
                <th
                  class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Jumlah
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Jenis
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Pos
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700"
            >
              <tr v-if="isLoading" class="animate-pulse">
                <td
                  colspan="5"
                  class="px-4 py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  Memuat data...
                </td>
              </tr>
              <tr
                v-for="(transaction, index) in sortedDetails"
                :key="index"
                class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ formatDate(transaction.Tanggal) }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div class="max-w-md">
                    {{ transaction.Deskripsi }}
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    class="font-medium"
                    :class="{
                      'text-green-600 dark:text-green-400': isIncome(
                        transaction.Jenis,
                      ),
                      'text-red-600 dark:text-red-400': !isIncome(
                        transaction.Jenis,
                      ),
                    }"
                  >
                    {{ isIncome(transaction.Jenis) ? "+" : "-" }}
                    {{ formatCurrency(transaction.Jumlah) }}
                  </span>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm">
                  <UBadge
                    :color="isIncome(transaction.Jenis) ? 'success' : 'error'"
                    variant="soft"
                    size="sm"
                  >
                    {{ isIncome(transaction.Jenis) ? "Masuk" : "Keluar" }}
                  </UBadge>
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ transaction.Pos }}
                </td>
              </tr>
              <tr v-if="!isLoading && monthlyDetails.length === 0">
                <td
                  colspan="5"
                  class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <UIcon
                    name="i-mdi-file-document-outline"
                    class="w-12 h-12 mx-auto mb-2 opacity-50"
                  />
                  <p>Belum ada transaksi bulan ini</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Data Cards - Mobile & Tablet -->
        <div class="lg:hidden space-y-4">
          <div v-if="isLoading" class="animate-pulse">
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>

          <div
            v-for="(transaction, index) in sortedDetails"
            :key="index"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div class="flex justify-between items-start gap-2 mb-2">
              <span
                class="text-lg font-bold"
                :class="{
                  'text-green-600 dark:text-green-400': isIncome(
                    transaction.Jenis,
                  ),
                  'text-red-600 dark:text-red-400': !isIncome(
                    transaction.Jenis,
                  ),
                }"
              >
                {{ isIncome(transaction.Jenis) ? "+" : "-" }}
                {{ formatCurrency(transaction.Jumlah) }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(transaction.Tanggal) }}
              </span>
            </div>

            <p
              class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3"
            >
              {{ transaction.Deskripsi }}
            </p>

            <div class="flex items-center gap-2">
              <UBadge
                :color="isIncome(transaction.Jenis) ? 'success' : 'error'"
                variant="soft"
                size="xs"
              >
                {{ isIncome(transaction.Jenis) ? "Masuk" : "Keluar" }}
              </UBadge>
              <span
                v-if="transaction.Pos"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              >
                {{ transaction.Pos }}
              </span>
            </div>
          </div>

          <div
            v-if="!isLoading && monthlyDetails.length === 0"
            class="text-center py-8"
          >
            <UIcon
              name="i-mdi-file-document-outline"
              class="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400"
            />
            <p class="text-gray-500 dark:text-gray-400">
              Belum ada transaksi bulan ini
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
