'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { User } from '@supabase/supabase-js'
import Header from '../components/Header'

interface Fruit {
  id: number
  name: string
  price: number
  image_url: string
  participants: number
  created_at: string
}

export default function Home() {
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

  const fetchFruits = useCallback(async () => {
    const { data, error } = await supabase
      .from('fruits')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error fetching fruits:', error)
    } else {
      setFruits(data || [])
    }
  }, [supabase])

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) console.error('Error logging in:', error)
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error logging out:', error)
  }

  useEffect(() => {
    fetchFruits()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [fetchFruits, supabase])

  const getImageUrl = (path: string) => {
    if (!path) return '/images/placeholder-fruit.jpg'
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`
  }

  return (
    <div className="min-h-screen bg-green-100">
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <main className="p-4">
        <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">산지 직송 상품만을 취급합니다.</h2>
        {fruits.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {fruits.map((fruit) => (
              <Link href={`/fruit/${fruit.id}`} key={fruit.id} className="block">
                <div className="bg-white rounded-lg overflow-hidden shadow-md transition-transform hover:scale-105 cursor-pointer h-full flex flex-col">
                  <div className="relative aspect-square">
                    <Image
                      src={getImageUrl(fruit.image_url)}
                      alt={fruit.name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-grow">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 line-clamp-2">{fruit.name}</h3>
                    <p className="text-base text-gray-600">가격: {fruit.price.toLocaleString()}원</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-base">현재 판매 중인 과일이 없습니다.</p>
        )}
      </main>
    </div>
  )
}
