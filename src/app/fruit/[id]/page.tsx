'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Fruit {
  id: number
  name: string
  price: number
  stock: number
  image_url: string
  description: string
  participants: number
}

export default function FruitDetail() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const [suggestedPrice, setSuggestedPrice] = useState<number | ''>('')
  const [message, setMessage] = useState('')
  const [hasSuggested, setHasSuggested] = useState(false)
  const supabase = createClientComponentClient()
  const params = useParams()
  const { id } = params

  useEffect(() => {
    async function fetchFruit() {
      const { data, error } = await supabase
        .from('fruits')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) console.log('error', error)
      else setFruit(data)
    }

    fetchFruit()
  }, [id, supabase])

  function addToCart() {
    if (fruit) {
      const cart = JSON.parse(localStorage.getItem('cart') || '{}')
      cart[fruit.id] = (cart[fruit.id] || 0) + 1
      localStorage.setItem('cart', JSON.stringify(cart))
      alert('장바구니에 추가되었습니다.')
    }
  }

  async function suggestPrice() {
    if (!suggestedPrice || suggestedPrice <= 0) {
      setMessage('유효한 가격을 입력해주세요.')
      return
    }

    // 여기서 제안된 가격을 서버에 저장하고 참여자 수를 증가시킵니다.
    const { data, error } = await supabase
      .from('fruits')
      .update({ participants: (fruit?.participants || 0) + 1 })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating fruit:', error)
      setMessage('가격 제안 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } else {
      console.log(`제안된 가격: ${suggestedPrice}원 for 과일 ID: ${id}`)
      setMessage('가격 제안이 접수되었습니다. 검토 후 연락 드리겠습니다.')
      setHasSuggested(true)
      setFruit(data[0])
    }
  }

  if (!fruit) return <div className="text-center py-8">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0 h-64 md:h-auto md:w-1/2">
            <Image
              src={fruit.image_url || '/placeholder-fruit.jpg'}
              alt={fruit.name}
              layout="responsive"
              width={300}
              height={300}
              objectFit="cover"
            />
          </div>
          <div className="p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">{fruit.name}</h1>
            <p className="text-gray-600 mb-2 sm:mb-4">{fruit.description || '설명이 없습니다.'}</p>
            <p className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">가격: {fruit.price.toLocaleString()}원</p>
            <p className="text-gray-600 mb-2 sm:mb-4">재고: {fruit.stock}개</p>
            <button 
              onClick={addToCart}
              className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors mb-2 sm:mb-4"
            >
              장바구니에 추가
            </button>
            
            <div className="mt-4 sm:mt-6">
              <h2 className="text-lg font-semibold mb-2">원하는 가격 제안하기</h2>
              {!hasSuggested ? (
                <div className="flex flex-col sm:flex-row items-center">
                  <input
                    type="number"
                    value={suggestedPrice}
                    onChange={(e) => setSuggestedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="border rounded-l px-3 py-2 w-full sm:w-1/2 mb-2 sm:mb-0"
                    placeholder="원하는 가격 입력"
                  />
                  <button
                    onClick={suggestPrice}
                    className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 transition-colors"
                  >
                    제안하기
                  </button>
                </div>
              ) : (
                <p className="text-green-600 font-semibold">
                  현재 {fruit.participants}명의 고객이 가격 제안에 참여했습니다.
                </p>
              )}
              {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
            </div>

            <Link href="/" className="block text-center bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition-colors mt-4 sm:mt-6">
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}