'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Fruit {
  id: number
  name: string
  price: number
  image_url: string
  image_url_2: string
  description: string
  participants: number
  created_at: string
}

export default function FruitDetail() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [boxValues, setBoxValues] = useState<string[]>(['?', '?', '?', '?', '?'])
  const [isBoxesRevealed, setIsBoxesRevealed] = useState(false)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [isPurchaseConfirmed, setIsPurchaseConfirmed] = useState(false)
  const supabase = createClientComponentClient()
  const params = useParams()
  const id = params?.id

  const fetchFruit = useCallback(async () => {
    if (id) {
      try {
        const { data, error } = await supabase
          .from('fruits')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) {
          console.error('Error fetching fruit:', error)
          setMessage('과일 정보를 불러오는 중 오류가 발생했습니다.')
        } else {
          console.log('Fetched fruit:', data)
          setFruit(data)
        }
      } catch (error) {
        console.error('Unexpected error fetching fruit:', error)
        setMessage('예기치 못한 오류가 발생했습니다.')
      }
    } else {
      console.warn('No ID found in params')
      setMessage('유효하지 않은 과일 ID입니다.')
    }
  }, [id, supabase])

  useEffect(() => {
    fetchFruit()
  }, [fetchFruit])

  const calculateDiscountedPrices = useCallback(() => {
    if (!fruit) {
      console.warn('Fruit data is not available for calculating prices')
      return ['?', '?', '?', '?', '?']
    }
    const originalPrice = fruit.price
    const discounts = [1, 0.95, 0.92, 0.90, 0.88, 0.97]
    const discountedPrices = discounts.map(discount => 
      Math.round(originalPrice * discount).toLocaleString()
    )
    for (let i = discountedPrices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [discountedPrices[i], discountedPrices[j]] = [discountedPrices[j], discountedPrices[i]];
    }
    return discountedPrices.slice(0, 5)
  }, [fruit])

  const verifyPhone = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setMessage('유효한 전화번호를 입력해주세요.')
      return
    }
    setIsPhoneVerified(true)
    setMessage('전화���호가 확인되었습니다. 랜덤 박스를 선택해주세요.')
  }

  const selectBox = async (index: number) => {
    if (!isPhoneVerified) {
      setMessage('먼저 전화번호를 입력하고 확인해주세요.')
      return
    }

    if (isBoxesRevealed) {
      setMessage('이미 선택하셨습니다.')
      return
    }

    const discountedPrices = calculateDiscountedPrices()
    const selectedPriceString = discountedPrices[index].replace(',', '')
    const selectedPriceNumber = parseInt(selectedPriceString, 10)
    setSelectedPrice(selectedPriceNumber)

    const newBoxValues = [...boxValues]
    newBoxValues[index] = discountedPrices[index]
    setBoxValues(newBoxValues)
    setIsBoxesRevealed(true)
    setMessage(`${selectedPriceNumber.toLocaleString()}원에 당첨되었습니다! 구매하시겠습니까?`)
  }

  const confirmPurchase = async () => {
    if (!selectedPrice || !fruit) return

    try {
      const { data, error } = await supabase
        .from('price_suggestions')
        .insert([
          { 
            fruit_id: id, 
            suggested_price: selectedPrice,
            phone_number: phoneNumber,
            fruit_name: fruit.name
          }
        ])

      if (error) {
        console.error('Error submitting price suggestion:', error)
        setMessage(`구매 신청 중 오류가 발생했습니다: ${error.message}`)
      } else {
        console.log('Submitted price suggestion:', data)
        setMessage('구매가 완료되었습니다. 문자드리겠습니다!')
        setIsPurchaseConfirmed(true)
      }
    } catch (error) {
      console.error('Unexpected error during purchase confirmation:', error)
      setMessage('예기치 못한 오류가 발생했습니다. 다시 시도해 주세요.')
    }
  }

  const getImageUrl = (path: string) => {
    if (!path) {
      console.warn('Image path is not available')
      return '/images/placeholder-fruit.jpg'
    }
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`
    console.log('Image URL:', url)
    return url
  }

  if (!id) {
    return <div>유효하지 않은 과일 ID입니다.</div>
  }

  if (!fruit) return <div className="text-center py-8">로딩 중...</div>

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
                src={getImageUrl(fruit.image_url)}
                alt={fruit.name}
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div className="p-4 sm:p-8 w-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">{fruit.name}</h1>
              {fruit.description && (
                <p className="text-gray-600 mb-2 sm:mb-4">{fruit.description}</p>
              )}
              
              <div className="flex justify-between items-center mb-1 sm:mb-2">
                <p className="text-lg sm:text-xl font-semibold text-gray-800">가격: {fruit.price.toLocaleString()}원</p>
                <div className="text-xs text-gray-600">
                  <p>쿠팡 평균가: 27000원</p>
                  <p>네이버 평균가: 28000원</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col items-center my-4">
                  <p className={`text-sm mb-2 ${isBoxesRevealed ? 'text-gray-600' : 'text-red-600 font-bold'}`}>
                    {isBoxesRevealed 
                      ? `${selectedPrice?.toLocaleString()}원에 당첨되었습니다!` 
                      : isPhoneVerified
                        ? "원하시는 랜덤 박스를 선택해주세요!"
                        : "전화번호를 입력하시면 랜덤박스를 오픈할 기회가 주어집니다!"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {boxValues.map((value, index) => (
                      <button
                        key={index}
                        onClick={() => selectBox(index)}
                        disabled={!isPhoneVerified || isBoxesRevealed}
                        className={`w-20 h-20 ${
                          isBoxesRevealed && value === selectedPrice?.toLocaleString() 
                            ? 'bg-green-500' 
                            : isPhoneVerified && !isBoxesRevealed
                              ? 'bg-yellow-400 hover:bg-yellow-500'
                              : 'bg-gray-300'
                        } rounded-lg shadow-md flex items-center justify-center text-lg font-bold text-white transition-colors`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 sm:mt-6">
                 
                  <div className="space-y-2">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="border rounded-full px-4 py-2 w-full"
                      placeholder="전화번호 입력 (예: 01012345678)"
                      disabled={isPhoneVerified}
                    />
                    {!isPhoneVerified ? (
                      <button
                        onClick={verifyPhone}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                      >
                        전화번호 입력하고 랜덤박스 열기
                      </button>
                    ) : isBoxesRevealed && !isPurchaseConfirmed ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={confirmPurchase}
                          className="flex-1 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
                        >
                          구매하기
                        </button>
                        <button
                          onClick={() => setMessage('구매를 취소하셨습니다.')}
                          className="flex-1 bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
                        >
                          취소하기
                        </button>
                      </div>
                    ) : isPurchaseConfirmed ? (
                      <p className="text-center text-green-600 font-semibold">구매가 완료되��습니다!</p>
                    ) : (
                      <p className="text-center text-blue-600 font-semibold">랜덤 박스를 선택해주세요!</p>
                    )}
                  </div>
                  {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
                </div>
                <Link href="/" className="block text-center bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition-colors">
                  홈으로 돌아가기
                </Link>

                
                
                <div className="mt-8 w-full aspect-square relative">
                  <Image
                    src={getImageUrl(fruit.image_url_2)}
                    alt={`${fruit.name} 추가 이미지`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                </div>
                {/* 추가 설명 테이블 */}
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-semibold text-gray-700">항목</th>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-semibold text-gray-700">내용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border-b border-gray-200">원산지</td>
                    <td className="py-2 px-4 border-b border-gray-200">경주 하늘내 농원 (국내산)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b border-gray-200">보관 방법</td>
                    <td className="py-2 px-4 border-b border-gray-200">냉장 보관</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b border-gray-200">유통 기한</td>
                    <td className="py-2 px-4 border-b border-gray-200">구매 후 7일</td>
                  </tr>
                  {/* 추가적인 설명 항목을 여기에 추가할 수 있습니다 */}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}