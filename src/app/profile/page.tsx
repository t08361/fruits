'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getProfile()
  }, [])

  return (
    <div className="min-h-screen p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">사용자 프로필</h1>
      {user ? (
        <div>
          <p>이메일: {user.email}</p>
          <p>ID: {user.id}</p>
        </div>
      ) : (
        <p>로그인이 필요합니다.</p>
      )}
      <Link href="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded">
        홈으로 돌아가기
      </Link>
    </div>
  )
}