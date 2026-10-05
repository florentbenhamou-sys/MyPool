/**
 * Version « fichier HTML unique » : réutilise les pages et le moteur de l'app Next.js,
 * en remplaçant la base SQLite par le stockage du navigateur.
 *   npm run build:html  →  ../auto-couts.html (à ouvrir par double-clic)
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

const r = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  root: __dirname,
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: { "process.env.NEXT_PUBLIC_STANDALONE": JSON.stringify("1") },
  resolve: {
    alias: [
      { find: /^@\/app\/actions$/, replacement: r("shims/actions.ts") },
      { find: /^@\/lib\/data$/, replacement: r("shims/data.ts") },
      { find: /^@\/lib\/db$/, replacement: r("shims/db.ts") },
      { find: /^next\/link$/, replacement: r("shims/next-link.tsx") },
      { find: /^next\/navigation$/, replacement: r("shims/next-navigation.ts") },
      { find: /^@\//, replacement: r("../src") + "/" },
    ],
  },
  build: { outDir: r("dist"), emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
