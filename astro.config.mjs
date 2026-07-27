import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://ruby-hitomi.fortunestudios.jp',
  integrations: [
    tailwind({
      applyBaseStyles: false
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7
    })
  ],
  output: 'static',
  prefetch: true,
  markdown: {
    shikiConfig: {
      theme: 'github-light'
    }
  }
});
