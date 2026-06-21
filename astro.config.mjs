// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Update this once the production domain is connected in Cloudflare.
const SITE = "https://rosewoodliving.pages.dev";

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Static by default for speed/SEO. Individual routes (e.g. the enquiry API)
  // opt into on-demand rendering via `export const prerender = false`.
  output: "static",
  adapter: cloudflare({
    imageService: "compile",
  }),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
