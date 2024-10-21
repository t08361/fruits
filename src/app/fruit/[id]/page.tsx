'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Header from '../../../components/Header'

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [activeSearch, setActiveSearch] = useState<'naver' | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()
  const params = useParams()
  const router = useRouter()
  const id = params?.id
  const [openedBoxes, setOpenedBoxes] = useState<number[]>([])
  const [selectedCoupons, setSelectedCoupons] = useState<Coupon[]>([])
  const [revealedCoupons, setRevealedCoupons] = useState<Coupon[]>([])
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const [isBoxOpened, setIsBoxOpened] = useState(false)

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

  const getRandomCoupon = useCallback(() => {
    const coupons = [
      { name: '무료배송', value: '무료배송' },
      { name: '500원 할인', value: '500' },
      { name: '500원 할인', value: '500' },
      { name: '1000원 할인', value: '1000' },
      { name: '1000원 할인', value: '1000' },
      { name: '1500원 할인', value: '1500' },
      { name: '2000원 할인', value: '2000' }
    ]
    return coupons[Math.floor(Math.random() * coupons.length)]
  }, [])

  const calculateCoupons = useCallback(() => {
    if (!fruit) {
      console.warn('Fruit data is not available for calculating coupons')
      return Array(6).fill({ name: '?', value: '?' })
    }

    const coupons: Coupon[] = []

    // 첫 번째 박스에 95% 확률로 무료배송 쿠폰 추가
    if (Math.random() < 1) {
      coupons.push({ name: '무료배송', value: '무료배송' })
    } else {
      coupons.push(getRandomCoupon())
    }

    // 두 번째 박스에 무료배송 쿠폰이 아닌 다른 쿠폰 추가
    coupons.push(getRandomCoupon())

    // 나머지 4개 박스에 랜덤 쿠폰 추가
    for (let i = 2; i < 6; i++) {
      coupons.push(getRandomCoupon())
    }

    // 최종적으로 무작위로 섞기
    return coupons.sort(() => Math.random() - 0.5)
  }, [fruit, getRandomCoupon])

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
      setIsBoxOpened(true)
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

  const handlePurchase = async () => {
    if (user) {
      if (selectedCoupons.length > 0) {
        const couponParams = encodeURIComponent(encodeURIComponent(JSON.stringify(selectedCoupons)));
        router.push(`/purchase/${id}?coupons=${couponParams}`);
      } else {
        alert('구매하기 전에 할인 쿠폰을 열어주세요!');
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

  const handleComparePrice = useCallback(() => {
    // 네이버 검색 활성화
    setActiveSearch('naver');
    
    // 화면 스크롤
    setTimeout(() => {
      searchSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'  // 이 부분을 추가합니다.
      });
    }, 100);  // 약간의 지연을 추가합니다.
  }, []);

  const renderCouponBoxes = () => (
    <div className="flex flex-col items-center my-4 w-full px-2">
      <p className={`text-base mb-3 font-bold ${isBoxOpened ? 'text-red-600' : 'text-red-600'}`}>
        {isBoxOpened ? "결제 후에 할인 쿠폰을 받아 보세요!" : "할인 쿠폰 박스를 열어주세요!"}
      </p>
      <div className="grid grid-cols-3 gap-2 w-full">
        {boxValues.map((coupon, index) => (
          <button
            key={index}
            onClick={() => selectBox(index)}
            disabled={isBoxesRevealed || openedBoxes.includes(index)}
            className={`w-full h-12 ${
              openedBoxes.includes(index)
                ? 'bg-green-500'
                : isBoxesRevealed
                ? 'bg-gray-300'
                : 'bg-yellow-300 hover:bg-yellow-500'
            } rounded-lg shadow-md flex items-center justify-center text-sm font-semibold text-white transition-colors`}
          >
            {openedBoxes.includes(index) ? revealedCoupons[index].name : '?'}
          </button>
        ))}
      </div>
    </div>
  )

  if (!id) {
    return <div>유효하지 않은 과일 ID입니다.</div>
  }

  if (!fruit) return <div className="text-center py-8">로딩 중...</div>

  return (
    <div className="min-h-screen bg-green-100">
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">{fruit.name}</h1>
                {fruit.description && (
                  <p className="text-gray-600 mb-2 sm:mb-4">{fruit.description}</p>
                )}
                <div className="flex justify-between items-center mb-1 sm:mb-2">
                  <p className="text-lg sm:text-xl font-semibold text-gray-800">가격: {fruit.price.toLocaleString()}원 (무료배송)</p>
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={handleComparePrice}
                      className="text-sm bg-green-400 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors"
                    >
                      가격 비교하러 가기
                    </button>
                  </div>
                </div>
                <div className="space-y-7">
                  {renderCouponBoxes()}
                  {isBoxesRevealed && (
                    <div className="mt-4 text-center">
                      <p className="text-lg font-semibold text-green-600">
                        선택된 할인 쿠폰: {selectedCoupons.map(coupon => coupon.name).join(', ')}
                      </p>
                      <button
                        onClick={handlePurchase}
                        className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
                      >
                        {user ? '결제하기' : '간편 로그인'}
                      </button>
                    </div>
                  )}
                  <div className="mt-4 sm:mt-6">
                    {message && !isBoxesRevealed && <p className="mt-2 text-sm text-gray-600">{message}</p>}
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
              
              {/* 두 번째 이미지도 주석 제 */}
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
              <div ref={searchSectionRef} className="mt-8 mb-4">  {/* mt-4를 mt-8 변경 */}
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
      </div>
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-lg font-bold mb-4">로그인이 필요합니다</h2>
            <p className="mb-4">구매를 진행하려면 로그인주세요.</p>
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
