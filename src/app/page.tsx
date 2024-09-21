'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface Fruit {
  id: number
  name: string
  price: number
  stock: number
  image_url: string // 이미지 URL을 위한 새 필드
  participants: number // 참여 중인 고객 수
}

export default function Home() {
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [cart, setCart] = useState<{[key: number]: number}>({})
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchFruits()
    checkUser()
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  async function fetchFruits() {
    const { data, error } = await supabase
      .from('fruits')
      .select('*')
      .gt('stock', 0)  // 재고가 0보다 큰 상품만 선택
    if (error) console.log('error', error)
    else setFruits(data)
  }

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) console.log('로그인 오류:', error)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) console.log('로그아웃 오류:', error)
    else {
      setUser(null)
      router.push('/')
    }
  }

  function addToCart(fruitId: number) {
    setCart(prev => {
      const newCart = {...prev, [fruitId]: (prev[fruitId] || 0) + 1}
      localStorage.setItem('cart', JSON.stringify(newCart))
      return newCart
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-4 sm:mb-0">신선한 과일 마켓</h1>
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/profile" className="text-green-600 hover:text-green-800 transition-colors text-sm sm:text-base">프로필</Link>
              <button onClick={signOut} className="bg-red-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full hover:bg-red-600 transition-colors text-sm sm:text-base">로그아웃</button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/auth/login" className="text-green-600 hover:text-green-800 transition-colors text-sm sm:text-base">로그인</Link>
              <Link href="/auth/signup" className="bg-green-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full hover:bg-green-600 transition-colors text-sm sm:text-base">회원가입</Link>
            </div>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8 text-center text-gray-800">오늘의 신선한 과일</h2>
        {fruits.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {fruits.map((fruit) => (
              <Link href={`/fruit/${fruit.id}`} key={fruit.id}>
                <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer">
                  <div className="relative h-40 sm:h-48">
                    <Image 
                      src={fruit.image_url || '/placeholder-fruit.jpg'} 
                      alt={fruit.name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-gray-800">{fruit.name}</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-1">가격: {fruit.price.toLocaleString()}원</p>
                    <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4">재고: {fruit.stock}개</p>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(fruit.id);
                      }}
                      className="w-full bg-green-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full hover:bg-green-600 transition-colors text-sm sm:text-base"
                    >
                      장바구니에 추가
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-base sm:text-lg">현재 판매 중인 과일이 없습니다.</p>
        )}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-white shadow-md py-3 sm:py-4">
        <div className="container mx-auto px-4 text-center">
          <Link href="/cart" className="inline-flex items-center justify-center bg-yellow-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full text-sm sm:text-lg font-semibold hover:bg-yellow-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            장바구니 보기 ({Object.values(cart).reduce((a, b) => a + b, 0)}개)
          </Link>
        </div>
      </footer>
    </div>
  )
}
