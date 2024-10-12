import './globals.css'
import { Analytics } from "@vercel/analytics/react"
import { SupabaseProvider } from '../components/SupabaseProvider'

export const metadata = {
  title: '신선마켓 몽당몽당열매',
  description: '산지 직송 상품만을 취급합니다.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
        <Analytics />
      </body>
    </html>
  )
}
