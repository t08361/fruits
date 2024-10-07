'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'

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

  useEffect(() => {
    fetchFruits()
  }, [fetchFruits])

  const getImageUrl = (path: string) => {
    if (!path) return '/images/placeholder-fruit.jpg'
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <header className="bg-white shadow-md sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-green-600">신선마켓 몽당몽당열매</h1>
          <a href="https://www.instagram.com/name_your.price/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>
      </header>
      <main className="p-4">
        <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">산지 직송 상품만을 취급합니다.</h2>
        {fruits.length > 0 ? (
          <div className="grid grid-cols-2 gap-4"> {/* 여기를 수정했습니다 */}
            {fruits.map((fruit) => (
              <Link href={`/fruit/${fruit.id}`} key={fruit.id} className="block">
                <div className="bg-white rounded-lg overflow-hidden shadow-md transition-transform hover:scale-105 cursor-pointer">
                  <div className="relative aspect-square">
                    <Image
                      src={getImageUrl(fruit.image_url)}
                      alt={fruit.name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">{fruit.name}</h3>
                    <p className="text-base text-gray-600 mb-1">가격: {fruit.price.toLocaleString()}원</p>
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