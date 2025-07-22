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
    class="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
  >
    <!-- Timeline dot -->
    <div class="flex-shrink-0">
      <div
        class="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
        :class="{
          'bg-green-500': getType === 'income',
          'bg-red-500': getType === 'expense',
        }"
      />
    </div>

    <!-- Transaction details -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <p
          class="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 wrap-normal"
        >
          {{ transaction.Uraian }}
        </p>
        <div class="flex items-center space-x-2 ml-2">
          <span
            class="text-xs sm:text-sm font-semibold whitespace-nowrap"
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
      <div class="flex items-center justify-between mt-1">
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {{ transaction.Kategori }}

          <span v-if="transaction.Nama">
            dari {{ transaction.Nama }} - {{ transaction["Nomor Rumah"] }}
          </span>
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ formatDate(transaction.Tanggal) }}
        </p>
      </div>
    </div>
  </div>
</template>
