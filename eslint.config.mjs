// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  // Your custom configs here
  [
    {
      rules: {
        "no-console": "error",
        "vue/block-order": [
          "error",
          {
            order: ["script", "template", "style"],
          },
        ],
        "vue/block-lang": [
          "error",
          {
            script: {
              lang: "ts",
            },
          },
        ],
      },
    },
  ],
);
