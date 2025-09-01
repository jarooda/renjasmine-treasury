<script setup lang="ts">
import {
  formatCurrency,
  formatDate,
  parseNumericValue,
} from "~/utils/formatters";

// Meta tags
useHead({
  title: "Kas Umum - Treasury Management",
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

type KasUmum = {
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

const kasUmumData = reactive<KasUmum[]>([]);

// Pagination state
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Search state
const searchQuery = ref("");

const {
  data: kasUmumResponse,
  pending: isLoading,
  error,
} = await useFetch<SheetResponse<KasUmum[]>>("/api/gsheet", {
  query: { sheet: "Buku Kas" },
  transform: (data) => {
    // Reverse the data to show the latest transactions first
    return { ...data, data: data.data.reverse() };
  },
});

if (error.value) {
  showError();
} else if (kasUmumResponse.value) {
  kasUmumData.splice(0, kasUmumData.length, ...kasUmumResponse.value.data);
}

// Computed properties for filtering and search
const filteredData = computed(() => {
  if (!searchQuery.value.trim()) {
    return kasUmumData;
  }

  const query = searchQuery.value.toLowerCase().trim();
  return kasUmumData.filter((transaction) => {
    return (
      formatDate(transaction.Tanggal)?.toLowerCase().includes(query) ||
      transaction.Uraian?.toLowerCase().includes(query) ||
      transaction.Nama?.toLowerCase().includes(query)
    );
  });
});

// Computed properties for pagination
const totalPages = computed(() =>
  Math.ceil(filteredData.value.length / itemsPerPage.value),
);
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredData.value.slice(start, end);
});

const startItem = computed(
  () => (currentPage.value - 1) * itemsPerPage.value + 1,
);
const endItem = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, filteredData.value.length),
);

// Watch for itemsPerPage changes to reset current page
watch(itemsPerPage, () => {
  currentPage.value = 1;
});

// Watch for search query changes to reset current page
watch(searchQuery, () => {
  currentPage.value = 1;
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
          Kas Umum
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Detail transaksi kas umum
        </p>
      </div>

      <!-- Data Table Card -->
      <UCard>
        <template #header>
          <div
            class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:gap-3"
          >
            <!-- Search Bar -->
            <div class="flex-1 max-w-md">
              <UInput
                v-model="searchQuery"
                placeholder="Cari berdasarkan tanggal, uraian, atau nama..."
                class="w-full"
                icon="i-mdi-magnify"
                size="md"
              >
                <template #trailing>
                  <UButton
                    v-show="searchQuery"
                    color="neutral"
                    variant="link"
                    icon="i-mdi-close"
                    :padded="false"
                    @click="searchQuery = ''"
                  />
                </template>
              </UInput>
            </div>
            <div class="flex items-center space-x-2 sm:space-x-4">
              <!-- Items per page selector -->
              <div
                class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
              >
                <span class="hidden sm:inline">Tampilkan:</span>
                <USelectMenu
                  v-model="itemsPerPage"
                  :items="[10, 25, 50, 100]"
                  class="w-20"
                />
                <span>per halaman</span>
              </div>

              <div
                class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
              >
                <UIcon name="i-mdi-table" class="w-4 h-4" />
                <span v-if="searchQuery">
                  {{ filteredData.length }} dari
                  {{ kasUmumData.length }} transaksi
                </span>
                <span v-else>{{ filteredData.length }} transaksi</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Data Table - Desktop -->
        <div class="hidden xl:block overflow-x-auto">
          <table
            class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          >
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  No
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Tanggal
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Uraian
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Nama
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  No. Rumah
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Kategori
                </th>
                <th
                  class="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Masuk
                </th>
                <th
                  class="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Keluar
                </th>
                <th
                  class="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
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
                  colspan="9"
                  class="px-4 py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  Memuat data...
                </td>
              </tr>
              <tr
                v-for="(transaction, index) in paginatedData"
                :key="index"
                class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                >
                  {{
                    transaction.Nomor ||
                    (currentPage - 1) * itemsPerPage + index + 1
                  }}
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
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ transaction["Nomor Rumah"] }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="{
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300':
                        transaction.Kategori === 'Penerimaan',
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300':
                        transaction.Kategori !== 'Penerimaan',
                    }"
                  >
                    {{ transaction.Kategori }}
                  </span>
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
              <tr
                v-if="!isLoading && filteredData.length === 0 && !searchQuery"
              >
                <td
                  colspan="9"
                  class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <UIcon
                    name="i-mdi-file-document-outline"
                    class="w-12 h-12 mx-auto mb-2 opacity-50"
                  />
                  <p>Belum ada transaksi</p>
                </td>
              </tr>
              <tr v-if="!isLoading && filteredData.length === 0 && searchQuery">
                <td
                  colspan="9"
                  class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <UIcon
                    name="i-mdi-magnify"
                    class="w-12 h-12 mx-auto mb-2 opacity-50"
                  />
                  <p>Tidak ada hasil untuk "{{ searchQuery }}"</p>
                  <UButton
                    variant="link"
                    size="sm"
                    class="mt-2"
                    @click="searchQuery = ''"
                  >
                    Hapus pencarian
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Data Cards - Mobile & Tablet -->
        <div class="xl:hidden space-y-4">
          <div v-if="isLoading" class="animate-pulse">
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>

          <div
            v-for="(transaction, index) in paginatedData"
            :key="index"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center space-x-2">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
                >
                  #{{
                    transaction.Nomor ||
                    (currentPage - 1) * itemsPerPage + index + 1
                  }}
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(transaction.Tanggal) }}
                </span>
              </div>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300':
                    transaction.Kategori === 'Penerimaan',
                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300':
                    transaction.Kategori !== 'Penerimaan',
                }"
              >
                {{ transaction.Kategori }}
              </span>
            </div>

            <div class="space-y-2 mb-3">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ transaction.Uraian }}
                </p>
                <div class="flex items-center space-x-4 mt-1">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ transaction.Nama }}
                  </p>
                  <span
                    v-if="transaction['Nomor Rumah']"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Rumah {{ transaction["Nomor Rumah"] }}
                  </span>
                </div>
              </div>
            </div>

            <div
              class="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700"
            >
              <div class="text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
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
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
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
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
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
            v-if="!isLoading && filteredData.length === 0 && !searchQuery"
            class="text-center py-8"
          >
            <UIcon
              name="i-mdi-file-document-outline"
              class="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400"
            />
            <p class="text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
          </div>

          <div
            v-if="!isLoading && filteredData.length === 0 && searchQuery"
            class="text-center py-8"
          >
            <UIcon
              name="i-mdi-magnify"
              class="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400"
            />
            <p class="text-gray-500 dark:text-gray-400 mb-2">
              Tidak ada hasil untuk "{{ searchQuery }}"
            </p>
            <UButton variant="link" size="sm" @click="searchQuery = ''">
              Hapus pencarian
            </UButton>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700"
        >
          <div
            class="flex flex-col space-y-1 sm:space-y-0 text-sm text-gray-500 dark:text-gray-400"
          >
            <span
              >Menampilkan {{ startItem }} - {{ endItem }} dari
              {{ filteredData.length }} transaksi</span
            >
            <!-- Debug info - hidden on mobile -->
            <span
              class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded sm:hidden"
            >
              Page: {{ currentPage }}/{{ totalPages }}
            </span>
          </div>

          <div class="flex justify-center sm:justify-end">
            <UPagination
              v-model:page="currentPage"
              :page-count="totalPages"
              :total="filteredData.length"
              size="lg"
              show-last
              show-first
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
