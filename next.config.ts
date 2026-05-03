import "./node-compat.cjs";
import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const configDir = path.dirname(__filename);

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: configDir,
  },
};

export default nextConfig;
