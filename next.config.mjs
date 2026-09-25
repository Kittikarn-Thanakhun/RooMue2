import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const securityHeaders = [
  // Prevent this site from being embedded in iframes on other origins (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stop browsers from guessing content types (MIME-sniffing attacks)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send the origin (no path/query) in cross-origin Referer headers
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features the app doesn't use
  { key: 'Permissions-Policy', value: 'geolocation=(), interest-cohort=()' },
  // Enable HSTS once deployed to HTTPS (1 year, include subdomains)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Native addons (ONNX Runtime's .node binding, sharp's libvips) can't be
  // parsed by webpack — load them via Node's real require at runtime instead
  // of bundling, otherwise the build chokes trying to parse binary files for
  // every platform target inside onnxruntime-node's bin/ directory.
  experimental: {
    serverComponentsExternalPackages: ["onnxruntime-node", "sharp"],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
