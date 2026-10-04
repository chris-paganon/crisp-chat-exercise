// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginTailwindcss from "eslint-plugin-tailwindcss";

export default withNuxt(
  {
    // necessary to add vue files support
    files: ["**/*.{js,jsx,ts,tsx,vue}"],
    ignores: ["app/components/ui/**"],
    // using extends like in the github example doesn't work with the nuxt config
    plugins: {
      tailwindcss: eslintPluginTailwindcss,
    },
    settings: {
      tailwindcss: {
        cssConfigPath: "./app/assets/css/tailwind.css",
      },
    },
    // since we don't use the extends property, we add the rules here
    rules: {
      ...eslintPluginTailwindcss.configs.recommended.rules,
      "tailwindcss/no-custom-classname": "off",
    },
  },
);
