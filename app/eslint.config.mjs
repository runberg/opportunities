import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __dirname = dirname(fileURLToPath(import.meta.url))

// eslint-config-next 15 still ships legacy (eslintrc) configs; FlatCompat adapts them.
const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "uploads/**",
      "next-env.d.ts",
      "prisma/seed.js",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Project standard: no console.log in production code. console.warn/error are the
      // server-side logging channel for now, so they stay allowed.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Prisma seed runs as a one-off CLI script, where console output is the intended interface.
    files: ["prisma/**"],
    rules: { "no-console": "off" },
  },
]

export default eslintConfig
