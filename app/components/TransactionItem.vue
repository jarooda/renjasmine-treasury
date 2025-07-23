<script setup lang="ts">
import { formatCurrency, formatDate } from "~/utils/formatters";

// Props definition
const props = defineProps({
  transaction: {
    type: Object,
    default: () => ({
      Nomor: "",
      Tanggal: "",
      Uraian: "",
      Nama: "",
      "Nomor Rumah": "",
      Kategori: "",
      Masuk: "",
      Keluar: "",
      Saldo: "",
    }),
  },
});

const getType = computed(() => {
  return props.transaction.Kategori === "Penerimaan" ? "income" : "expense";
});
</script>

<template>
  <div
    class="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 lg:p-5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
  >
    <!-- Timeline dot -->
    <div class="flex-shrink-0 pt-1">
      <div
        class="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full mt-1"
        :class="{
          'bg-green-500': getType === 'income',
          'bg-red-500': getType === 'expense',
        }"
      />
    </div>

    <!-- Transaction details -->
    <div class="flex-1 min-w-0">
      <!-- Mobile: Stack vertically, Desktop: Side by side -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4"
      >
        <!-- Transaction description -->
        <div class="flex-1 min-w-0">
          <p
            class="text-sm sm:text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 break-words"
          >
            {{ transaction.Uraian }}
          </p>
        </div>

        <!-- Amount - prominent on mobile -->
        <div class="flex-shrink-0 order-first sm:order-last">
          <span
            class="text-base sm:text-lg lg:text-xl font-bold block sm:inline whitespace-nowrap"
            :class="{
              'text-green-600 dark:text-green-400': getType === 'income',
              'text-red-600 dark:text-red-400': getType === 'expense',
            }"
          >
            {{ getType === "income" ? "+" : "-" }}
            {{
              formatCurrency(
                getType === "income" ? transaction.Masuk : transaction.Keluar,
              )
            }}
          </span>
        </div>
      </div>

      <!-- Secondary info -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mt-2"
      >
        <!-- Category and source info -->
        <div class="flex-1 min-w-0">
          <p
            class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 break-words"
          >
            <span class="font-medium">{{ transaction.Kategori }}</span>
            <span v-if="transaction.Nama" class="block sm:inline">
              <span class="hidden sm:inline"> • </span>
              <span class="text-gray-600 dark:text-gray-300">
                dari {{ transaction.Nama }} - {{ transaction["Nomor Rumah"] }}
              </span>
            </span>
          </p>
        </div>

        <!-- Date -->
        <div class="flex-shrink-0">
          <p class="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
            {{ formatDate(transaction.Tanggal) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
