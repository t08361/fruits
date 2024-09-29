'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

  const getProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }, [supabase.auth])

  useEffect(() => {
    getProfile()
  }, [getProfile])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getProfile()
    })
    return () => subscription.unsubscribe()
  }, [supabase.auth, getProfile])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">사용자 프로필</h1>
        {user ? (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600">이메일</p>
              <p className="font-semibold text-gray-800">{user.email}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600">ID</p>
              <p className="font-semibold text-gray-800">{user.id}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600 bg-yellow-100 p-4 rounded-lg">로그인이 필요합니다.</p>
        )}
        <div className="mt-8 flex justify-center">
          <Link href="/" className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition-colors duration-300 shadow-md">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}