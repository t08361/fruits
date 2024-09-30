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
        <p className="mb-2"><strong>이벤트 설명 : 해당 과일을 원하시는 가격에 구매하세요.</strong></p>
        <p className="mb-2"><strong>가격:</strong> {fruit.price.toLocaleString()}원</p>
        <p className="mb-2"><strong>선착순:</strong> {fruit.stock}명</p>
        <p className="mb-5"><strong>이벤트 종료 시간:</strong> {eventEndTime.toLocaleString()}</p>
        <h2 className="text-2xl font-bold mb-2">이벤트 규칙</h2>
        <ul className="list-disc list-inside mb-4">
          <li>원하는 가격을 제안할 수 있습니다.</li>
          <li>가장 높은 가격순으로 선착순 선발합니다.</li>
          <li>선착순 인원의 제안 금액의 평균을 내어 판매자가 마진율을 책정합니다.</li>
          <li>판매자가 수익이 확인되면 거래 승인🎉, 거래 실패😞 여부를 고객님들께 문자로 보내드립니다.</li>
          <li>이벤트 종료 후에도 재고 소진까지 구매 신청 가능합니다. (단, 원하는 가격 제안 불가능)</li>
        </ul>
        <div className="mb-5"></div>
        <h2 className="text-2xl font-bold mb-2">구매 절차</h2>
        <ul className="list-disc list-inside mb-4">
        <li>이벤트 시작시간 기준 다음날 오전 7시까지 원하는 가격을 제안해주십니다. </li>
        <li>이벤트가 끝나면 판매자가 마진율을 확인하여 거래가 승인되면 문자로 결과를 알려드립니다.</li>
          <li>첫 거래 시 : 거래 확정 문자 받으시면 입금 후에 입금자명, 주소를 문자 보내주시면 상품 배송해드립니다.</li>
          <li>이후 거래 : 거래 확정 문자 확인 후 입금 해주시면 바로 상품 배송해드립니다.</li>
          <li>이벤트 참여 다음날 오전 중에 산지에서 직접 배송해드립니다.</li>
        </ul>
        <Link href={`/fruit/${id}`} className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition-colors inline-block">
          상품 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}