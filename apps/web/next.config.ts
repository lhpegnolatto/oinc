import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // The dev-mode route indicator badge sits bottom-left and can intercept
  // pointer events for controls near that corner (e.g. a right-side sheet's
  // footer buttons) in Playwright — errors/warnings still surface without it.
  devIndicators: false,
};

export default nextConfig;
