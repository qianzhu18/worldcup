// Proxy-aware fetch utility for development behind a proxy.
// Uses node-fetch + https-proxy-agent when HTTP_PROXY/HTTPS_PROXY env vars are set.

import nodeFetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;

let agent: InstanceType<typeof HttpsProxyAgent> | undefined;
if (PROXY_URL) {
  agent = new HttpsProxyAgent(PROXY_URL);
  console.log("[proxy-fetch] Using proxy:", PROXY_URL);
}

/**
 * Fetch with automatic proxy support.
 * In production (Cloudflare Workers), proxy is not needed.
 * In development, uses HTTP_PROXY/HTTPS_PROXY env vars.
 */
export async function proxyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Only use proxy in development (Node.js runtime)
  if (agent && typeof window === "undefined") {
    // Use node-fetch with proxy agent
    const fetchOptions: any = {
      ...options,
      agent,
    };
    return nodeFetch(url, fetchOptions) as unknown as Promise<Response>;
  }

  return fetch(url, options);
}

/**
 * Check if proxy is configured
 */
export function isProxyConfigured(): boolean {
  return !!PROXY_URL;
}
