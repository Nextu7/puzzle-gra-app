import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals({ nativeFetch: true });

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server. The CLI will eventually
// stop passing in HOST, so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
  .hostname;
let hmrConfig;

// Always use localhost for WebSocket server to avoid EADDRNOTAVAIL errors
hmrConfig = {
  protocol: "ws",
  host: "localhost",
  port: 64999,
  clientPort: 64999,
};

export default defineConfig({
  server: {
    host: "localhost",
    allowedHosts: [
      "localhost", 
      "127.0.0.1",
      "sisters-conceptual-orchestra-computers.trycloudflare.com",
      // Dynamic Cloudflare tunnel host
      ...(process.env.SHOPIFY_APP_URL ? [new URL(process.env.SHOPIFY_APP_URL).hostname] : [])
    ],
    cors: {
      origin: [
        'http://localhost:3000',
        'https://localhost:3000',
        /\.ngrok-free\.app$/,
        /\.ngrok\.io$/,
        /\.trycloudflare\.com$/
      ],
      preflightContinue: true,
      credentials: true,
    },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    timeout: 120000,
    keepAliveTimeout: 5000,
    headersTimeout: 60000,
    fs: {
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
        v3_routeConfig: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ["@shopify/app-bridge-react", "@shopify/polaris"],
  },
});
