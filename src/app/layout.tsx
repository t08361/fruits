import './globals.css'
import { Analytics } from "@vercel/analytics/react"
import { SupabaseProvider } from '../components/SupabaseProvider'
import Footer from '../components/Footer'

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
      <body className="flex flex-col min-h-screen">
        <SupabaseProvider>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </SupabaseProvider>
        <Analytics />
      </body>
    </html>
  )
}
