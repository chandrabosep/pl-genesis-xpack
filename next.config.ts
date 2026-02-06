import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Use this project as the root so module resolution (e.g. tailwindcss) uses this directory’s node_modules.
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
