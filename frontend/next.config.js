/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "font-src 'self' https://vercel.com https://*.vercel.com https://*.gstatic.com https://*.public.blob.vercel-storage.com;"
          }
        ],
      },
    ]
  },
}

export default nextConfig;