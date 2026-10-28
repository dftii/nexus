import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind CSS v4 is compiled through its Turbopack loader (the default
  // bundler in Next.js 16). Theme tokens live in src/app/globals.css.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
