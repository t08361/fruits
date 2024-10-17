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
    domains: ['localhost'], // 로컬 개발을 위해 추가
  },
}

module.exports = nextConfig
