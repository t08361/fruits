/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-project-id.supabase.co'],
  },
  async redirects() {
    return [
      {
        source: '/auth/callback',
        destination: '/',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig