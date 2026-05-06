import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import * as http from 'node:http';
import * as https from 'node:https';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const DEV_MT_PHOTOS_PROXY_PATH = '/__kwphoto_mt_proxy';

/**
 * Proxies MT Photos requests during local development.
 * Media GETs need a same-origin URL to avoid browser ORB/CORS blocking, while
 * uploads need service-specific headers that localhost preflight cannot send.
 */
const mtPhotosDevProxy = (): Plugin => {
  return {
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith(DEV_MT_PHOTOS_PROXY_PATH)) {
          next();
          return;
        }

        void proxyMtPhotosRequest(request, response).catch((error: unknown) => {
          sendProxyError(response, error instanceof Error ? error.message : 'Proxy request failed.');
        });
      });
    },
    name: 'kwphoto-mtphotos-dev-proxy',
  };
};

/**
 * Forwards the raw browser request body to the selected MT Photos server.
 */
const proxyMtPhotosRequest = (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  return new Promise((resolve, reject) => {
    const targetUrl = readProxyTarget(request.url);
    const client = targetUrl.protocol === 'https:' ? https : http;
    const proxyRequest = client.request(
      targetUrl,
      {
        headers: createProxyRequestHeaders(request.headers, targetUrl),
        method: request.method,
      },
      (proxyResponse) => {
        response.writeHead(proxyResponse.statusCode ?? 502, filterProxyResponseHeaders(proxyResponse.headers));
        proxyResponse.pipe(response);
        proxyResponse.on('end', resolve);
      },
    );

    request.on('aborted', () => proxyRequest.destroy());
    proxyRequest.on('error', reject);
    request.pipe(proxyRequest);
  });
};

/**
 * Reads and validates the absolute target URL from the proxy query.
 */
const readProxyTarget = (requestUrl = ''): URL => {
  const proxyUrl = new URL(requestUrl, 'http://localhost');
  const target = proxyUrl.searchParams.get('target');

  if (!target) {
    throw new Error('Missing proxy target.');
  }

  const targetUrl = normalizeProxyTargetUrl(new URL(target));

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new Error('Unsupported proxy target protocol.');
  }

  return targetUrl;
};

/**
 * Normalizes browser headers before forwarding through the dev proxy.
 */
const createProxyRequestHeaders = (headers: IncomingHttpHeaders, targetUrl: URL): OutgoingHttpHeaders => {
  const nextHeaders: OutgoingHttpHeaders = {
    accept: headers.accept,
    'accept-language': headers['accept-language'],
    'cache-control': headers['cache-control'],
    'content-length': headers['content-length'],
    'content-type': headers['content-type'],
    ctime: headers.ctime,
    devicename: headers.devicename,
    filename: headers.filename,
    jwt: headers.jwt,
    mtextra: headers.mtextra,
    pragma: headers.pragma,
    range: headers.range,
    referer: `${targetUrl.origin}/`,
    'user-agent': headers['user-agent'],
  };

  nextHeaders.host = targetUrl.host;

  return Object.fromEntries(
    Object.entries(nextHeaders).filter(([, value]) => value !== undefined),
  ) as OutgoingHttpHeaders;
};

/**
 * Avoids forwarding public media endpoints through plain HTTP when the server
 * address was saved without HTTPS.
 */
const normalizeProxyTargetUrl = (targetUrl: URL): URL => {
  if (targetUrl.protocol !== 'http:' || isPrivateHost(targetUrl.hostname)) {
    return targetUrl;
  }

  const nextUrl = new URL(targetUrl.toString());
  nextUrl.protocol = 'https:';

  return nextUrl;
};

const isPrivateHost = (hostname: string): boolean => {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
};

/**
 * Removes hop-by-hop headers that should not be replayed to the browser.
 */
const filterProxyResponseHeaders = (headers: IncomingHttpHeaders): OutgoingHttpHeaders => {
  const nextHeaders: OutgoingHttpHeaders = { ...headers };

  delete nextHeaders.connection;
  delete nextHeaders['keep-alive'];
  delete nextHeaders['proxy-authenticate'];
  delete nextHeaders['proxy-authorization'];
  delete nextHeaders.te;
  delete nextHeaders.trailer;
  delete nextHeaders['transfer-encoding'];
  delete nextHeaders.upgrade;
  nextHeaders['access-control-allow-origin'] = '*';
  nextHeaders['access-control-allow-methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
  nextHeaders['access-control-allow-headers'] = '*';

  return nextHeaders;
};

/**
 * Sends a compact JSON error when the dev proxy cannot reach the target server.
 */
const sendProxyError = (response: ServerResponse, message: string): void => {
  if (response.headersSent) {
    response.end();
    return;
  }

  response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ message, statusCode: 502 }));
};

export default defineConfig({
  clearScreen: false,
  plugins: [react(), tailwindcss(), mtPhotosDevProxy()],
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['../desktop/dist/**', '../mobile/**'],
    },
  },
  envPrefix: ['VITE_'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('/node_modules/framer-motion') || id.includes('/node_modules/motion')) {
            return 'vendor-motion';
          }

          if (id.includes('/node_modules/antd') || id.includes('/node_modules/@ant-design')) {
            return 'vendor-antd';
          }

          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom')) {
            return 'vendor-react';
          }

          return undefined;
        },
      },
    },
    target: 'es2022',
  },
});
