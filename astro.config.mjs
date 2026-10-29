import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jitendravaidya.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (p) => !p.includes('/admin') })],
  vite: { plugins: [tailwindcss()] },
});
