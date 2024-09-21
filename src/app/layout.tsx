import './globals.css'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    )
  } catch (error) {
    console.error('Error in RootLayout:', error)
    return (
      <html lang="en">
        <body>
          <p>오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
        </body>
      </html>
    )
  }
}
