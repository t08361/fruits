'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Timer from '@/components/Timer'

interface Fruit {
  id: number
  name: string
  price: number
  stock: number
  image_url: string
  image_url_2: string  // 두 번째 이미지 URL 추가
  description: string
  participants: number
  created_at: string
}

export default function FruitDetail() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const [suggestedPrice, setSuggestedPrice] = useState<number | ''>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [isEventEnded, setIsEventEnded] = useState(false)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const supabase = createClientComponentClient()
  const params = useParams()
  const id = params?.id

  const fetchFruit = useCallback(async () => {
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
        const createdAt = new Date(data.created_at)
        const endTime = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate() + 1, 7, 0, 0)
        setEndTime(endTime)
      }
    }
  }, [id, supabase])

  useEffect(() => {
    fetchFruit()
  }, [fetchFruit])

  useEffect(() => {
    if (endTime) {
      const timer = setInterval(() => {
        if (new Date() >= endTime) {
          setIsEventEnded(true)
          clearInterval(timer)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [endTime])

  function setCurrentPrice() {
    if (fruit) {
      if (isEventEnded) {
        setShowPhoneInput(true)
      } else {
        setSuggestedPrice(fruit.price)
      }
    }
  }

  async function submitPurchase() {
    if (!phoneNumber || phoneNumber.length < 10) {
      setMessage('유효한 전화번호를 입력해주세요.')
      return
    }

    try {
      let result;
      if (isEventEnded) {
        // 이벤트가 종료된 경우, price_suggestions 테이블에 데이터 삽입
        result = await supabase
          .from('price_suggestions')
          .insert([
            { 
              fruit_id: id, 
              suggested_price: fruit?.price, // 현재 과일 가격 사용
              phone_number: phoneNumber 
            }
          ])
          .select()
      } else {
        // 이벤트가 진행 중인 경우, 기존의 purchases 테이블에 데이터 삽입
        result = await supabase
          .from('purchases')
          .insert([
            { 
              fruit_id: id, 
              price: fruit?.price,
              phone_number: phoneNumber 
            }
          ])
          .select()
      }

      const { data, error } = result;

      if (error) {
        console.error('Error submitting purchase:', error)
        setMessage(`구매 신청 중 오류가 발생했습니다: ${error.message}`)
      } else {
        console.log('Submitted purchase:', data)
        setMessage('구매 신청이 완료되었습니다. 곧 연락 드리겠습니다.')
        setPhoneNumber('')
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setMessage('예기치 못한 오류가 발생했습니다. 다시 시도해 주세요.')
    }
  }

  async function suggestPrice() {
    if (!suggestedPrice || suggestedPrice <= 0) {
      setMessage('유효한 가격을 입력해주세요.')
      return
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setMessage('유효한 전화번호를 입력해주세요.')
      return
    }

    if (!fruit) {
      setMessage('과일 정보를 불러오는 중 오류가 발생했습니다.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('price_suggestions')
        .insert([
          { 
            fruit_id: id, 
            fruit_name: fruit.name,  // 과일 이름 추가
            suggested_price: suggestedPrice, 
            phone_number: phoneNumber 
          }
        ])
        .select()

      if (error) {
        console.error('Error submitting price suggestion:', error)
        setMessage(`가격 제안 중 오류가 발생했습니다: ${error.message}`)
      } else {
        console.log('Submitted price suggestion:', data)
        setMessage('가격 제안이 접수되었습니다. 내일 오전 7시 결과 문자드리고 당일 배송해드립니다.')
        setSuggestedPrice('')
        setPhoneNumber('')
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setMessage('예기치 못한 오류가 발생했습니다. 다시 시도해 주세요.')
    }
  }

  const getImageUrl = (path: string) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`;
    console.log('Image URL:', url);
    return url;
  }

  if (!id) {
    return <div>유효하지 않은 과일 ID입니다.</div>
  }

  if (!fruit || !endTime) return <div className="text-center py-8">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 sm:py-6 flex justify-between items-center">
          <Link href="/" className="text-2xl sm:text-3xl font-bold text-green-600">신선마켓 몽당몽당열매</Link>
          <a href="https://www.instagram.com/name_your.price/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>
      </header>
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex md:flex-col md:items-center">
            <div className="w-full aspect-square relative">
              <Image
                src={getImageUrl(fruit.image_url) || '/images/placeholder-fruit.jpg'}
                alt={fruit.name}
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div className="p-4 sm:p-8 w-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">{fruit.name}</h1>
              <p className="text-gray-600 mb-2 sm:mb-4">{fruit.description || '설명이 없습니다.'}</p>
              <div className="flex justify-between items-center mb-1 sm:mb-2">
                <p className="text-lg sm:text-xl font-semibold text-gray-800">가격: {fruit.price.toLocaleString()}원</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-medium text-gray-600">가격비교</span>
                  <a href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(fruit.name)}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z"/>
                    </svg>
                  </a>
                </div>
              </div>
              <p className="text-gray-600 mb-2 sm:mb-4">선착순: {fruit.stock}명</p>
              
              <div className="space-y-4">
                <button 
                  onClick={setCurrentPrice}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
                >
                  {isEventEnded ? "구매 신청하기" : "현재가로 즉시 구매"}
                </button>
                <div className="flex justify-between items-center">
                  {!isEventEnded ? (
                    <Timer endTime={endTime} />
                  ) : (
                    <p className="text-lg font-semibold text-red-600">이벤트가 종료되었습니다.</p>
                  )}
                  <Link href={`/event-info/${id}`} className="text-blue-500 hover:text-blue-700 transition-colors">
                    이벤트 설명 ⓘ
                  </Link>
                </div>
                {isEventEnded && showPhoneInput && (
                  <div className="mt-4 sm:mt-6">
                    <h2 className="text-lg font-semibold mb-2">구매 신청하기</h2>
                    <div className="space-y-2">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="border rounded-full px-4 py-2 w-full"
                        placeholder="전화번호 입력 (예: 01012345678)"
                      />
                      <button
                        onClick={submitPurchase}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                      >
                        구매 신청
                      </button>
                    </div>
                    {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
                  </div>
                )}
                {!isEventEnded && (
                  <div className="mt-4 sm:mt-6">
                    {/* <h2 className="text-lg font-semibold mb-2">원하는 가격 제안하기</h2> */}
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={suggestedPrice}
                        onChange={(e) => setSuggestedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="border rounded-full px-4 py-2 w-full"
                        placeholder="원하는 가격 입력"
                      />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="border rounded-full px-4 py-2 w-full"
                        placeholder="전화번호 입력 (예: 01012345678)"
                      />
                      <button
                        onClick={suggestPrice}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                      >
                        제안하기
                      </button>
                    </div>
                    {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
                  </div>
                )}
                <Link href="/" className="block text-center bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition-colors">
                  홈으로 돌아가기
                </Link>
                
                <div className="mt-8 w-full aspect-square relative">
                  <Image
                    src={getImageUrl(fruit.image_url_2) || '/images/placeholder-fruit-2.jpg'}
                    alt={`${fruit.name} 추가 이미지`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}