'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'

interface Fruit {
  id: number
  name: string
  price: number
  stock: number
  image_url: string
  participants: number
  created_at: string
}

export default function Home() {
  const [fruits, setFruits] = useState<Fruit[]>([])
  const supabase = createClientComponentClient()

  const fetchFruits = useCallback(async () => {
    const { data, error } = await supabase
      .from('fruits')
      .select('*')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
    if (error) {
      console.log('error', error)
    } else {
      console.log('Fetched fruits:', data)
      setFruits(data || [])
    }
  }, [supabase])

  useEffect(() => {
    fetchFruits()
  }, [fetchFruits])

  const getImageUrl = (path: string) => {
    if (!path) return '/images/placeholder-fruit.jpg'
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`
    console.log('Image URL:', url)
    return url
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 sm:py-6 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600">신선마켓 몽당몽당열매</h1>
          <a href="https://www.instagram.com/p/C_pNg5vp6Df/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-8 text-center text-gray-800">산지 직송 상품만을 취급합니다.</h2>
        {fruits.length > 0 ? (
          <div className="space-y-4">
            {fruits.map((fruit) => (
              <Link href={`/fruit/${fruit.id}`} key={fruit.id} className="block">
                <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer flex">
                  <div className="relative w-2/5 h-56">
                    <Image
                      src={getImageUrl(fruit.image_url)}
                      alt={fruit.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-l-lg"
                    />
                  </div>
                  <div className="p-12 w-3/5">
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">{fruit.name}</h3>
                    <p className="text-lg text-gray-600 mb-2">가격: {fruit.price.toLocaleString()}원</p>
                    <p className="text-base text-gray-600">선착순: {fruit.stock}명</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-base sm:text-lg">현재 판매 중인 과일이 없습니다.</p>
        )}
      </main>
    </div>
  )
}