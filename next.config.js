/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vfosqarthtqnlrcbalfl.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/fruits/**',
      },
    ],
  },
}

module.exports = nextConfig
