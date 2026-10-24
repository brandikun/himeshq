import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { inlineScriptHashes } from './integrations/inline-script-hashes';

// LEARN: astro.config.ts is Astro's single config file; `output: 'static'` (the default) builds plain HTML into dist/.
export default defineConfig({
  output: 'static',
  site: 'https://himeshq.com',
  integrations: [inlineScriptHashes()],
  build: {
    // Keep CSS in external files so the CSP can say style-src 'self' with no inline styles.
    inlineStylesheets: 'never',
  },
  vite: {
    // LEARN: Tailwind v4 ships as a Vite plugin; there is no tailwind.config.js, theme tokens live in CSS.
    plugins: [tailwindcss()],
  },
});
