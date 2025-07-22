<script setup lang="ts">
// Mobile menu state
const mobileMenuOpen = ref(false);

// Dark mode management
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === "dark");

const toggleDarkMode = () => {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
};

// Close mobile menu when route changes
const route = useRoute();
watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false;
  },
);
</script>

<template>
  <NuxtLoadingIndicator />
  <UApp>
    <div
      class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col"
    >
      <!-- Navigation Bar -->
      <nav
        class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50"
      >
        <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div class="flex justify-between items-center h-14 sm:h-16">
            <!-- Logo/Brand -->
            <div class="flex-shrink-0">
              <NuxtLink to="/" class="flex items-center space-x-2">
                <div
                  class="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center"
                >
                  <UIcon name="i-mdi-cloud-print" class="w-5 h-5 text-white" />
                </div>
                <h1
                  class="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100"
                >
                  Perum Renjana & Jasmine
                </h1>
              </NuxtLink>
            </div>

            <!-- Desktop Navigation Links -->
            <div class="hidden lg:block">
              <div class="flex items-center space-x-1">
                <NuxtLink
                  to="/"
                  class="nav-link"
                  :class="{ 'nav-link-active': $route.path === '/' }"
                >
                  Home
                </NuxtLink>
                <NuxtLink
                  to="/kas-umum"
                  class="nav-link"
                  :class="{ 'nav-link-active': $route.path === '/kas-umum' }"
                >
                  Kas Umum
                </NuxtLink>
                <NuxtLink
                  to="/kas-pompa-air"
                  class="nav-link"
                  :class="{
                    'nav-link-active': $route.path === '/kas-pompa-air',
                  }"
                >
                  Kas Pompa Air
                </NuxtLink>
                <NuxtLink
                  to="/kas-rt"
                  class="nav-link"
                  :class="{ 'nav-link-active': $route.path === '/kas-rt' }"
                >
                  Kas RT
                </NuxtLink>
                <NuxtLink
                  to="/monitor-pembayaran"
                  class="nav-link"
                  :class="{
                    'nav-link-active': $route.path === '/monitor-pembayaran',
                  }"
                >
                  Monitor Kas
                </NuxtLink>
              </div>
            </div>

            <!-- Right side controls -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <!-- Dark mode toggle -->
              <UButton
                variant="ghost"
                size="sm"
                class="p-2"
                @click="toggleDarkMode"
              >
                <ClientOnly>
                  <UIcon
                    :name="
                      isDark ? 'i-mdi-weather-sunny' : 'i-mdi-weather-night'
                    "
                    class="w-4 h-4 sm:w-5 sm:h-5"
                  />
                  <template #fallback>
                    <UIcon
                      name="i-mdi-weather-night"
                      class="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </template>
                </ClientOnly>
              </UButton>

              <!-- Mobile menu button -->
              <UButton
                variant="ghost"
                size="sm"
                class="lg:hidden p-2"
                @click="mobileMenuOpen = !mobileMenuOpen"
              >
                <UIcon
                  :name="mobileMenuOpen ? 'i-mdi-close' : 'i-mdi-menu'"
                  class="w-5 h-5"
                />
              </UButton>
            </div>
          </div>

          <!-- Mobile Navigation -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div
              v-if="mobileMenuOpen"
              class="lg:hidden border-t border-gray-200 dark:border-gray-700 py-3"
            >
              <div class="flex flex-col space-y-1">
                <NuxtLink
                  to="/"
                  class="mobile-nav-link"
                  :class="{ 'mobile-nav-link-active': $route.path === '/' }"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon name="i-mdi-home" class="w-4 h-4" />
                  Home
                </NuxtLink>
                <NuxtLink
                  to="/kas-umum"
                  class="mobile-nav-link"
                  :class="{
                    'mobile-nav-link-active': $route.path === '/kas-umum',
                  }"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon name="i-mdi-cash-multiple" class="w-4 h-4" />
                  Kas Umum
                </NuxtLink>
                <NuxtLink
                  to="/kas-pompa-air"
                  class="mobile-nav-link"
                  :class="{
                    'mobile-nav-link-active': $route.path === '/kas-pompa-air',
                  }"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon name="i-mdi-water-pump" class="w-4 h-4" />
                  Kas Pompa Air
                </NuxtLink>
                <NuxtLink
                  to="/kas-rt"
                  class="mobile-nav-link"
                  :class="{
                    'mobile-nav-link-active': $route.path === '/kas-rt',
                  }"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon name="i-mdi-home-group" class="w-4 h-4" />
                  Kas RT
                </NuxtLink>
                <NuxtLink
                  to="/monitor-pembayaran"
                  class="mobile-nav-link"
                  :class="{
                    'mobile-nav-link-active':
                      $route.path === '/monitor-pembayaran',
                  }"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon name="i-mdi-chart-line" class="w-4 h-4" />
                  Monitor Kas
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </div>
      </nav>

      <!-- Main content -->
      <main class="flex-grow">
        <NuxtPage />
      </main>

      <!-- Footer -->
      <footer
        class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto"
      >
        <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
          <div
            class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
          >
            <!-- Copyright and Brand -->
            <div class="text-center md:text-left">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                © 2025 Perum Renjana & Jasmine Treasury. All rights reserved.
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Licensed under MIT License
              </p>
            </div>

            <!-- Developer Info -->
            <div class="flex flex-col items-center md:items-end space-y-2">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Developed by <span class="font-medium">Jalu Wibowo Aji</span>
              </p>
              <div class="flex items-center space-x-4 text-xs">
                <a
                  href="mailto:jaluwibowoaji@gmail.com"
                  class="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center space-x-1"
                >
                  <UIcon name="i-mdi-email" class="w-3 h-3" />
                  <span>jaluwibowoaji@gmail.com</span>
                </a>
                <a
                  href="https://jaluwibowo.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors flex items-center space-x-1"
                >
                  <UIcon name="i-mdi-web" class="w-3 h-3" />
                  <span>jaluwibowo.id</span>
                </a>
                <a
                  href="https://github.com/jarooda"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center space-x-1"
                >
                  <UIcon name="i-mdi-github" class="w-3 h-3" />
                  <span>github.com/jarooda</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </UApp>
</template>

<style scoped>
/* Desktop navigation links */
.nav-link {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link-active {
  background: linear-gradient(to right, #3b82f6, #33ea42);
  color: white;
}

.nav-link-active:hover {
  background: linear-gradient(to right, #2563eb, #33ea42);
}

/* Mobile navigation links */
.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  margin: 0 0.5rem;
  transition: all 0.2s;
}

.mobile-nav-link-active {
  background: linear-gradient(to right, #3b82f6, #33ea42);
  color: white;
}

.mobile-nav-link-active:hover {
  background: linear-gradient(to right, #2563eb, #33ea42);
}
</style>
