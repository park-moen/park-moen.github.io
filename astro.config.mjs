import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import expressiveCode from "astro-expressive-code";
import rehypeMermaid from "rehype-mermaid";

export default defineConfig({
  site: "https://park-moen.github.io",
  trailingSlash: "always",
  markdown: {
    rehypePlugins: [[rehypeMermaid, { mermaidConfig: { theme: "neutral" } }]],
  },
  integrations: [sitemap(), expressiveCode(), mdx()],
});
