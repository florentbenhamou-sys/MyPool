import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "storage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Prisma ne doit être utilisé que dans la couche data (src/server/data).
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              message: "Importer Prisma uniquement depuis src/server/data ou src/server/db.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/data/**", "src/server/db.ts", "prisma/**", "src/server/mappers/**"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
