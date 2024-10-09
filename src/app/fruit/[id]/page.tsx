'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  origin: string
  storage_method: string
  expiration_date: string
  shipping: string
}

export default function FruitDetail() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [boxValues, setBoxValues] = useState<string[]>(['?', '?', '?', '?', '?', '?'])
  const [isBoxesRevealed, setIsBoxesRevealed] = useState(false)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [isPurchaseConfirmed, setIsPurchaseConfirmed] = useState(false)
  const [activeSearch, setActiveSearch] = useState<'naver' | null>(null)
  const [showPurchaseMessage, setShowPurchaseMessage] = useState(false)
  const supabase = createClientComponentClient()
  const params = useParams()
  const id = params?.id

  const searchSectionRef = useRef<HTMLDivElement>(null)

  const scrollToSearchSection = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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
        setMessage('예기치 못한 오류��� 발생했습니다.')
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
      return ['?', '?', '?', '?', '?', '?']
    }
    const originalPrice = fruit.price
    const discounts = [1, 0.97, 0.92, 0.90, 0.99, 0.93, 0.91]  // 0.91 추가
    const discountedPrices = discounts.map(discount => 
      Math.round(originalPrice * discount).toLocaleString()
    )
    for (let i = discountedPrices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [discountedPrices[i], discountedPrices[j]] = [discountedPrices[j], discountedPrices[i]];
    }
    return discountedPrices.slice(0, 6)  // 6개로 변경
  }, [fruit])

  const selectBox = async (index: number) => {
    if (isBoxesRevealed) {
      setMessage('이미 선택하셨습니다.')
      return
    }

    const discountedPrices = calculateDiscountedPrices()
    const selectedPriceString = discountedPrices[index].replace(',', '')
    const selectedPriceNumber = parseInt(selectedPriceString, 10)
    setSelectedPrice(selectedPriceNumber)

    // 모든 박스의 값을 보이게 설정
    setBoxValues(discountedPrices)
    
    setIsBoxesRevealed(true)
    setMessage(`${selectedPriceNumber.toLocaleString()}원에 당첨되었습니다! 구매하시겠습니까?`)
  }

  const openPhoneModal = () => {
    setIsPhoneModalOpen(true)
  }

  const confirmPurchase = async () => {
    if (!selectedPrice || !fruit || !phoneNumber) {
      setMessage('화번호를 입력해주세요.')
      return
    }

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
        setShowPurchaseMessage(true)
        setIsPurchaseConfirmed(true)
        setIsPhoneModalOpen(false)
        // 타이머 제거
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

  const getSearchUrl = (portal: string, fruitName: string) => {
    const encodedName = encodeURIComponent(fruitName);
    switch (portal) {
      case 'naver':
        return `https://search.shopping.naver.com/search/all?query=${encodedName}`;
      default:
        return '#';
    }
  };

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
          <div className="md:flex">
            <div className="md:w-1/2">
              <div className="w-full aspect-[8/7] relative">
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
                  <button
                    onClick={scrollToSearchSection}
                    className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
                  >
                    가격 비교하러 가기
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col items-center my-4">
                    <p className={`text-sm mb-2 font-bold ${isBoxesRevealed ? 'text-red-600' : 'text-red-600'}`}>
                      {isBoxesRevealed 
                        ? `원래 가격보다 ${fruit!.price - selectedPrice!}원 더 저렴하게 구매할 수 있습니다!`
                        : "원하시는 랜덤 박스를 선택해주세요!"}
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex justify-center gap-2">
                        {boxValues.slice(0, 3).map((value, index) => (
                          <button
                            key={index}
                            onClick={() => selectBox(index)}
                            disabled={isBoxesRevealed}
                            className={`w-20 h-20 ${
                              isBoxesRevealed
                                ? value === selectedPrice?.toLocaleString()
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                                : 'bg-yellow-400 hover:bg-yellow-500'
                            } rounded-lg shadow-md flex items-center justify-center text-lg font-bold text-white transition-colors`}
                          >
                            <span className={value === '?' && !isBoxesRevealed ? 'animate-bounce-soft inline-block' : ''}>
                              {value}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-center gap-2">
                        {boxValues.slice(3, 6).map((value, index) => (
                          <button
                            key={index + 3}
                            onClick={() => selectBox(index + 3)}
                            disabled={isBoxesRevealed}
                            className={`w-20 h-20 ${
                              isBoxesRevealed
                                ? value === selectedPrice?.toLocaleString()
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                                : 'bg-yellow-400 hover:bg-yellow-500'
                            } rounded-lg shadow-md flex items-center justify-center text-lg font-bold text-white transition-colors`}
                          >
                            <span className={value === '?' && !isBoxesRevealed ? 'animate-bounce-soft inline-block' : ''}>
                              {value}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6">
                    <div className="space-y-2">
                      {isBoxesRevealed && !isPurchaseConfirmed && (
                        <button
                          onClick={openPhoneModal}
                          className="w-full bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
                        >
                          구매하기
                        </button>
                      )}
                      {showPurchaseMessage && (
                        <p className="text-center text-green-600 font-semibold animate-slide-lr-10s">
                          구매가 완료되었습니다. 문자드리겠습니다!
                        </p>
                      )}
                    </div>
                    {message && !isPurchaseConfirmed && <p className="mt-2 text-sm text-gray-600">{message}</p>}
                  </div>
                  <Link href="/" className="block text-center bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition-colors mt-4">
                    홈으로 돌아가기
                  </Link>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 p-4">
              {/* 추가 설명 테이블 */}
              <table className="min-w-full bg-white mb-4">
                <thead>
                  <tr>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-semibold text-gray-700">항목</th>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-semibold text-gray-700">내용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border-b border-gray-200">원산지</td>
                    <td className="py-2 px-4 border-b border-gray-200">{fruit.origin || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b border-gray-200">배송</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {fruit.shipping === '무료배송' ? (
                        <span className="text-green-500 font-bold">{fruit.shipping}</span>
                      ) : (
                        fruit.shipping || '정보 없음'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b border-gray-200">보관 방법</td>
                    <td className="py-2 px-4 border-b border-gray-200">{fruit.storage_method || '정보 없음'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b border-gray-200">유통 기한</td>
                    <td className="py-2 px-4 border-b border-gray-200">{fruit.expiration_date || '정보 없음'}</td>
                  </tr>
                </tbody>
              </table>
              
              {/* 두 번째 이미지 */}
              <div className="w-full aspect-[4/3] relative mt-4">
                <Image
                  src={getImageUrl(fruit.image_url_2)}
                  alt={`${fruit.name} 추가 이미지`}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>
              
              {/* 검색 섹션 */}
              <div ref={searchSectionRef} className="mt-4 mb-4 flex justify-center">
                <button
                  onClick={() => setActiveSearch('naver')}
                  className={`px-4 py-2 rounded-full ${activeSearch === 'naver' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                >
                  네이버에서 검색
                </button>
              </div>
              {activeSearch && (
                <div className="h-[600px] border border-gray-300 rounded-lg overflow-hidden">
                  <iframe
                    src={getSearchUrl('naver', fruit?.name || '')}
                    className="w-full h-full"
                    title="네이버 검색 결과"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isPhoneModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-lg font-bold mb-4">전화번호를 입력해주세요</h2>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="border rounded-full px-4 py-2 w-full mb-4"
              placeholder="예시: 01012345678"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsPhoneModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded-full"
              >
                취소
              </button>
              <button
                onClick={confirmPurchase}
                className="px-4 py-2 bg-green-500 text-white rounded-full"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}