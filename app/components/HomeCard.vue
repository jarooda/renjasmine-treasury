<script setup lang="ts">
import { formatCurrency } from "~/utils/formatters";
import type { PropType } from "vue";

// Define theme type
type Theme = "blue" | "cyan" | "green" | "red";

// Props definition
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  showData: {
    type: Boolean,
    default: true,
  },
  balance: {
    type: String,
    default: "0",
  },
  detailLink: {
    type: String,
    required: true,
  },
  theme: {
    type: String as PropType<Theme>,
    default: "blue" as Theme,
    validator: (value: unknown): value is Theme =>
      ["blue", "cyan", "green", "red"].includes(value as string),
  },
  cardClass: {
    type: String,
    default: "",
  },
});

// Computed styles based on theme
const iconBgClass = computed(() => {
  const themes: Record<Theme, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/30",
    cyan: "bg-cyan-50 dark:bg-cyan-900/30",
    green: "bg-green-50 dark:bg-green-900/30",
    red: "bg-red-50 dark:bg-red-900/30",
  };
  return themes[props.theme] || themes.blue;
});

const iconColorClass = computed(() => {
  const themes: Record<Theme, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
  };
  return themes[props.theme] || themes.blue;
});

const balanceColorClass = computed(() => {
  const themes: Record<Theme, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
  };
  return themes[props.theme] || themes.blue;
});
</script>

<template>
  <NuxtLink :to="detailLink">
    <UCard
      class="hover:shadow-lg dark:hover:shadow-gray-700/25 transition-shadow duration-300 h-fit"
      :class="cardClass"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h3
            class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ title }}
          </h3>
          <div
            class="p-2 rounded-full w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center"
            :class="iconBgClass"
          >
            <UIcon
              :name="icon"
              class="w-6 h-6 sm:w-6 sm:h-6"
              :class="iconColorClass"
            />
          </div>
        </div>
      </template>

      <div
        v-if="showData"
        class="flex md:flex-col justify-between md:items-start items-center gap-4"
      >
        <p class="text-sm sm:text-base text-gray-500 dark:text-gray-400">
          Saldo saat ini
        </p>
        <div
          class="text-xl sm:text-2xl font-bold mb-2"
          :class="balanceColorClass"
        >
          {{ formatCurrency(balance) }}
        </div>
      </div>

      <div v-else class="text-gray-500 dark:text-gray-400 text-sm min-h-full">
        <slot />
      </div>

      <template #footer>
        <UButton variant="solid" block size="lg"> Lihat Detail </UButton>
      </template>
    </UCard>
  </NuxtLink>
</template>
