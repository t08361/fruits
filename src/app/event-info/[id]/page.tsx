'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Fruit {
  id: number
  name: string
  price: number
  stock: number
  description: string
  created_at: string
}

export default function EventInfo() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const supabase = createClientComponentClient()
  const params = useParams()
  const id = params?.id

  useEffect(() => {
    async function fetchFruit() {
      if (id) {
        const { data, error } = await supabase
          .from('fruits')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) {
          console.error('Error fetching fruit:', error)
        } else {
          setFruit(data)
        }
      }
    }
    fetchFruit()
  }, [id, supabase])

  if (!fruit) return <div className="text-center py-8">로딩 중...</div>

  const eventEndTime = new Date(new Date(fruit.created_at).getTime() + 24 * 60 * 60 * 1000)

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden p-6">
        <h1 className="text-3xl font-bold mb-4">{fruit.name} 이벤트 설명</h1>
        <p className="mb-4">{fruit.description}</p>
        <p className="mb-2"><strong>이벤트 가격:</strong> {fruit.price.toLocaleString()}원</p>
        <p className="mb-2"><strong>선착순:</strong> {fruit.stock}명</p>
        <p className="mb-4"><strong>이벤트 종료 시간:</strong> {eventEndTime.toLocaleString()}</p>
        <h2 className="text-2xl font-bold mb-2">이벤트 규칙</h2>
        <ul className="list-disc list-inside mb-4">
          <li>이벤트 기간 동안 현재 가격으로 즉시 구매 가능</li>
          <li>원하는 가격을 제안할 수 있으며, 이벤트 종료 후 검토</li>
          <li>이벤트 종료 후에도 구매 신청 가능 (재고 소진 시까지)</li>
        </ul>
        <Link href={`/fruit/${id}`} className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition-colors inline-block">
          상품 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}