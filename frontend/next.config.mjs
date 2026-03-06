/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false, // Hide Next.js version

  // ─── Images ──────────────────────────────────────────────────────────────
  images: {
    unoptimized: true, // Served by Nginx CDN, skip Next.js optimizer
    formats: ['image/webp', 'image/avif'],
  },

  // ─── Experimental Speed Features ─────────────────────────────────────────
  experimental: {
    optimizePackageImports: ['hls.js'],
  },

  // ─── HTTP Headers — Caching + Security + Performance ─────────────────────
  async headers() {
    return [
      // All pages — security headers
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          // Core Web Vitals: connection keep-alive
          { key: 'Connection', value: 'keep-alive' },
        ],
      },

      // Static assets — 1 year immutable cache (huge LCP improvement)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },

      // Public assets — match common static file extensions
      {
        source: '/:path*.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*.svg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },

      // ISR pages — serve from cache, revalidate in background
      {
        source: '/watch/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' }],
      },
      {
        source: '/genre/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' }],
      },
      {
        source: '/tag/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' }],
      },
      {
        source: '/actor/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' }],
      },
    ]
  },



  // ─── Webpack tweaks ───────────────────────────────────────────────────────
  webpack(config, { isServer }) {
    if (!isServer) {
      // Split hls.js into its own chunk — only loads on watch page
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          hls: {
            test: /[\\/]node_modules[\\/]hls\.js/,
            name: 'hls',
            chunks: 'all',
            priority: 30,
          },
        },
      }
    }
    return config
  },
}

export default nextConfig
