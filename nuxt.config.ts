// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@nuxt/eslint"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      logLevel: process.env.LOG_LEVEL || "1",
    },
  },
});
