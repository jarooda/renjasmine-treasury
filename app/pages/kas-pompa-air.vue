<script setup lang="ts">
import {
  formatCurrency,
  formatDate,
  parseNumericValue,
} from "~/utils/formatters";

// Meta tags
useHead({
  title: "Kas Pompa Air - Treasury Management",
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

type KasPompaAir = {
  Nomor: string;
  Tanggal: string;
  Uraian: string;
  Nama: string;
  Masuk: string;
  Keluar: string;
  Saldo: string;
};

const kasPompaAirData = reactive<KasPompaAir[]>([]);

const {
  data: kasPompaAirResponse,
  pending: isLoading,
  error,
} = await useFetch<SheetResponse<KasPompaAir[]>>("/api/gsheet", {
  query: { sheet: "Kas Pompa Air" },
  transform: (data) => {
    // Reverse the data to show the latest transactions first
    return { ...data, data: data.data.reverse() };
  },
});

if (error.value) {
  showError();
} else if (kasPompaAirResponse.value) {
  kasPompaAirData.splice(
    0,
    kasPompaAirData.length,
    ...kasPompaAirResponse.value.data,
  );
}
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
          Kas Pompa Air
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Detail transaksi kas pompa air
        </p>
      </div>

      <!-- Data Table Card -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Data Transaksi Kas Pompa Air
            </h3>
            <div
              class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
            >
              <UIcon name="i-mdi-table" class="w-4 h-4" />
              <span>{{ kasPompaAirData.length }} transaksi</span>
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
                  No
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Tanggal
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Uraian
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Nama
                </th>
                <th
                  class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Masuk
                </th>
                <th
                  class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Keluar
                </th>
                <th
                  class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700"
            >
              <tr v-if="isLoading" class="animate-pulse">
                <td
                  colspan="7"
                  class="px-4 py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  Memuat data...
                </td>
              </tr>
              <tr
                v-for="(transaction, index) in kasPompaAirData"
                :key="index"
                class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                >
                  {{ transaction.Nomor || index + 1 }}
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ formatDate(transaction.Tanggal) }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div class="max-w-xs">
                    {{ transaction.Uraian }}
                  </div>
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ transaction.Nama }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    v-if="
                      transaction.Masuk &&
                      parseNumericValue(transaction.Masuk) > 0
                    "
                    class="text-green-600 dark:text-green-400 font-medium"
                  >
                    {{ formatCurrency(transaction.Masuk) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    v-if="
                      transaction.Keluar &&
                      parseNumericValue(transaction.Keluar) > 0
                    "
                    class="text-red-600 dark:text-red-400 font-medium"
                  >
                    {{ formatCurrency(transaction.Keluar) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    class="font-medium"
                    :class="{
                      'text-green-600 dark:text-green-400':
                        parseNumericValue(transaction.Saldo) > 0,
                      'text-red-600 dark:text-red-400':
                        parseNumericValue(transaction.Saldo) < 0,
                      'text-gray-600 dark:text-gray-400':
                        parseNumericValue(transaction.Saldo) === 0,
                    }"
                  >
                    {{ formatCurrency(transaction.Saldo) }}
                  </span>
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
            v-for="(transaction, index) in kasPompaAirData"
            :key="index"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center space-x-2">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  #{{ transaction.Nomor || index + 1 }}
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(transaction.Tanggal) }}
                </span>
              </div>
            </div>

            <div class="space-y-2 mb-3">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ transaction.Uraian }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ transaction.Nama }}
                </p>
              </div>
            </div>

            <div
              class="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700"
            >
              <div class="text-center">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Masuk
                </p>
                <p class="text-sm font-medium">
                  <span
                    v-if="
                      transaction.Masuk &&
                      parseNumericValue(transaction.Masuk) > 0
                    "
                    class="text-green-600 dark:text-green-400"
                  >
                    {{ formatCurrency(transaction.Masuk) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </p>
              </div>
              <div class="text-center">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Keluar
                </p>
                <p class="text-sm font-medium">
                  <span
                    v-if="
                      transaction.Keluar &&
                      parseNumericValue(transaction.Keluar) > 0
                    "
                    class="text-red-600 dark:text-red-400"
                  >
                    {{ formatCurrency(transaction.Keluar) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </p>
              </div>
              <div class="text-center">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Saldo
                </p>
                <p
                  class="text-sm font-medium"
                  :class="{
                    'text-green-600 dark:text-green-400':
                      parseNumericValue(transaction.Saldo) > 0,
                    'text-red-600 dark:text-red-400':
                      parseNumericValue(transaction.Saldo) < 0,
                    'text-gray-600 dark:text-gray-400':
                      parseNumericValue(transaction.Saldo) === 0,
                  }"
                >
                  {{ formatCurrency(transaction.Saldo) }}
                </p>
              </div>
            </div>
          </div>

          <div
            v-if="!isLoading && kasPompaAirData.length === 0"
            class="text-center py-8"
          >
            <UIcon
              name="i-mdi-file-document-outline"
              class="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400"
            />
            <p class="text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
