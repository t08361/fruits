'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

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

interface Coupon {
  name: string;
  value: string;
}

export default function FruitDetail() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const [message, setMessage] = useState('')
  const [boxValues, setBoxValues] = useState<Coupon[]>([
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' }
  ])
  const [isBoxesRevealed, setIsBoxesRevealed] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isPurchaseConfirmed, setIsPurchaseConfirmed] = useState(false)
  const [activeSearch, setActiveSearch] = useState<'naver' | null>(null)
  const [showPurchaseMessage, setShowPurchaseMessage] = useState(false)
  const [discountedPrices, setDiscountedPrices] = useState<string[]>([])
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()
  const params = useParams()
  const router = useRouter()
  const id = params?.id

  const searchSectionRef = useRef<HTMLDivElement>(null)

  const [openedBoxes, setOpenedBoxes] = useState<number[]>([])
  const [revealedCoupons, setRevealedCoupons] = useState<Coupon[]>([])
  const [selectedCoupons, setSelectedCoupons] = useState<Coupon[]>([])

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
        setMessage('예기치 못한 오류 발생했습니다.')
      }
    } else {
      console.warn('No ID found in params')
      setMessage('유효하지 않은 과일 ID입니다.')
    }
  }, [id, supabase])

  useEffect(() => {
    fetchFruit()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [fetchFruit, supabase])

  const calculateCoupons = useCallback(() => {
    if (!fruit) {
      console.warn('Fruit data is not available for calculating coupons')
      return [
        { name: '?', value: '?' },
        { name: '?', value: '?' },
        { name: '?', value: '?' },
        { name: '?', value: '?' },
        { name: '?', value: '?' },
        { name: '?', value: '?' }
      ]
    }
    const coupons: Coupon[] = [
      { name: '무료배송', value: '무료배송' },
      { name: '2000원 할인', value: '2000' },
      { name: '3000원 할인', value: '3000' },
      { name: '5% 할인', value: '5%' },
      { name: '10% 할인', value: '10%' },
      { name: '1000원 할', value: '1000' }
    ]
    return coupons.sort(() => Math.random() - 0.5)
  }, [fruit])

  useEffect(() => {
    if (fruit) {
      const calculatedCoupons = calculateCoupons()
      setBoxValues(calculatedCoupons)
      setRevealedCoupons(calculatedCoupons)
    }
  }, [fruit, calculateCoupons])

  const selectBox = (index: number) => {
    if (openedBoxes.length >= 2) return
    
    const newOpenedBoxes = [...openedBoxes, index]
    setOpenedBoxes(newOpenedBoxes)
    
    const newSelectedCoupons = [...selectedCoupons, revealedCoupons[index]]
    setSelectedCoupons(newSelectedCoupons)
    
    if (newOpenedBoxes.length === 2) {
      setIsBoxesRevealed(true)
    }
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/fruit/${id}`
      }
    })
    if (error) console.error('Error logging in:', error)
    setIsLoginModalOpen(false)
  }

  const confirmPurchase = () => {
    if (user) {
      setIsPurchaseConfirmed(true)
      setShowPurchaseMessage(true)
      setTimeout(() => setShowPurchaseMessage(false), 10000)
    } else {
      setIsLoginModalOpen(true)
    }
  }

  const getImageUrl = (path: string) => {
    if (!path) {
      console.warn('Image path is not available')
      return '/images/placeholder-fruit.jpg'
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`
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

  const saveCouponsToDatabase = async (coupons: Coupon[]) => {
    if (!user) return;

    const { error } = await supabase.from('coupons').insert(
      coupons.map(coupon => ({
        user_id: user.id,
        coupon_type: coupon.name,
        coupon_value: coupon.value,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후 만료
      }))
    );

    if (error) {
      console.error('Error saving coupons:', error);
    }
  };

  const handlePurchase = async () => {
    if (user) {
      if (selectedCoupons.length > 0) {
        const couponParams = encodeURIComponent(encodeURIComponent(JSON.stringify(selectedCoupons)));
        router.push(`/purchase/${id}?coupons=${couponParams}`);
      } else {
        alert('구매하기 전에 랜덤박스를 열어주세요!');
      }
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error logging out:', error)
    } else {
      router.push('/')  // 로그아웃 후 홈페이지로 리다이렉트
    }
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
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/profile" className="text-green-600 hover:text-green-700">
                  프로필
                </Link>
                <button onClick={handleLogout} className="text-green-600 hover:text-green-700">
                  로그아웃
                </button>
              </>
            ) : (
              <button onClick={handleLogin} className="text-green-600 hover:text-green-700">
                간편 로그인
              </button>
            )}
            <a href="https://www.instagram.com/name_your.price/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </header>
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2">
              {/* 이미지 컴포넌트 주석 해제 */}
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
                    <p className={`text-sm mb-2 font-bold text-red-600`}>
                      {isBoxesRevealed 
                        ? <>
                            {selectedCoupon && typeof selectedCoupon.value === 'string' && selectedCoupon.value !== '무료배송'
                              ? `${(fruit.price - parseInt(selectedCoupon.value)).toLocaleString()}원 더 저렴하게 구매할 수 있습니다!`
                              : selectedCoupon && selectedCoupon.value === '무료배송'
                                ? '무료배송 쿠폰이 적용되었습니다!'
                                : '쿠폰이 적용되었습니다!'}
                          </>
                        : "원하시는 랜덤 박스를 선택해주세요!"}
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex justify-center gap-2">
                        {boxValues.slice(0, 3).map((coupon, index) => (
                          <button
                            key={index}
                            onClick={() => selectBox(index)}
                            disabled={isBoxesRevealed || openedBoxes.includes(index)}
                            className={`w-20 h-20 ${
                              openedBoxes.includes(index)
                                ? 'bg-green-500'
                                : isBoxesRevealed
                                ? 'bg-gray-300'
                                : 'bg-yellow-400 hover:bg-yellow-500'
                            } rounded-lg shadow-md flex items-center justify-center text-lg font-bold text-white transition-colors`}
                          >
                            <span className={!openedBoxes.includes(index) && !isBoxesRevealed ? 'animate-bounce-soft inline-block' : ''}>
                              {openedBoxes.includes(index) ? revealedCoupons[index].name : '?'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-center gap-2">
                        {boxValues.slice(3).map((coupon, index) => (
                          <button
                            key={index + 3}
                            onClick={() => selectBox(index + 3)}
                            disabled={isBoxesRevealed || openedBoxes.includes(index + 3)}
                            className={`w-20 h-20 ${
                              openedBoxes.includes(index + 3)
                                ? 'bg-green-500'
                                : isBoxesRevealed
                                ? 'bg-gray-300'
                                : 'bg-yellow-400 hover:bg-yellow-500'
                            } rounded-lg shadow-md flex items-center justify-center text-lg font-bold text-white transition-colors`}
                          >
                            <span className={!openedBoxes.includes(index + 3) && !isBoxesRevealed ? 'animate-bounce-soft inline-block' : ''}>
                              {openedBoxes.includes(index + 3) ? revealedCoupons[index + 3].name : '?'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isBoxesRevealed && !isPurchaseConfirmed && (
                    <div className="mt-4 text-center">
                      <p className="text-lg font-semibold text-green-600">
                        선택된 쿠폰: {selectedCoupons.map(coupon => coupon.name).join(', ')}
                      </p>
                      <button
                        onClick={handlePurchase}
                        className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
                      >
                        {user ? '쿠폰 적용하여 구매하기' : '간편 로그인'}
                      </button>
                    </div>
                  )}
                  <div className="mt-4 sm:mt-6">
                    <div className="space-y-2">
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
              
              {/* 두 번째 이미지도 주석 해제 */}
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
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-lg font-bold mb-4">로그인이 필요합니다</h2>
            <p className="mb-4">구매를 진행하려면 로그인해주세요.</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded-full"
              >
                취소
              </button>
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-green-500 text-white rounded-full"
              >
                간편 로그인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
