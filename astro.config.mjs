import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";

import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://park-moen.github.io",
  trailingSlash: "always",
  integrations: [sitemap(), expressiveCode(), mdx()],
});
