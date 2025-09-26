<script setup lang="ts">
import { formatCurrency, formatDate } from "~/utils/formatters";

// Props definition
const props = defineProps({
  transaction: {
    type: Object,
    default: () => ({
      Tanggal: "",
      Deskripsi: "",
      Jumlah: "",
      Jenis: "",
      Pos: "",
    }),
  },
});

const getType = computed(() => {
  return props.transaction.Jenis === "In" ? "income" : "expense";
});

const getPosLink = computed(() => {
  const pos = props.transaction.Pos;
  if (pos === "Buku Kas") return "/kas-umum";
  if (pos === "Kas RT") return "/kas-rt";
  if (pos === "Kas Pompa Air") return "/kas-pompa-air";
  return "/kas-umum"; // default fallback
});

const getPosColor = computed(() => {
  const pos = props.transaction.Pos;
  if (pos === "Buku Kas") return "primary";
  if (pos === "Kas RT") return "success";
  if (pos === "Kas Pompa Air") return "info";
  return "primary"; // default fallback
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
      <!-- Mobile: Amount first, then description -->
      <div class="flex flex-col gap-1">
        <!-- Amount - prominent on mobile, positioned at top -->
        <div class="flex justify-between items-start gap-2">
          <span
            class="text-lg sm:text-xl lg:text-2xl font-bold whitespace-nowrap"
            :class="{
              'text-green-600 dark:text-green-400': getType === 'income',
              'text-red-600 dark:text-red-400': getType === 'expense',
            }"
          >
            {{ getType === "income" ? "+" : "-" }}
            {{ formatCurrency(transaction.Jumlah) }}
          </span>

          <!-- Date moved to top right on mobile -->
          <p class="text-xs text-gray-400 dark:text-gray-500 sm:hidden">
            {{ formatDate(transaction.Tanggal) }}
          </p>
        </div>

        <!-- Transaction description -->
        <div class="min-w-0">
          <p
            class="text-sm sm:text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 break-words"
          >
            {{ transaction.Deskripsi }}
          </p>
        </div>
      </div>

      <!-- Secondary info -->
      <div class="mt-2">
        <!-- Pos info with link -->
        <div
          class="flex items-center justify-between sm:justify-start sm:gap-4"
        >
          <NuxtLink :to="getPosLink" class="inline-flex items-center gap-1">
            <UBadge
              :color="getPosColor"
              variant="soft"
              size="xs"
              class="hover:bg-opacity-80 transition-colors cursor-pointer"
            >
              {{ transaction.Pos }}
            </UBadge>
          </NuxtLink>

          <!-- Date - hidden on mobile (shown at top), visible on desktop -->
          <p
            class="hidden sm:block text-xs sm:text-sm text-gray-400 dark:text-gray-500"
          >
            {{ formatDate(transaction.Tanggal) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
