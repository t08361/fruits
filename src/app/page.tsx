'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { User } from '@supabase/supabase-js'
import Header from '../components/Header'

interface Fruit {
  id: number
  name: string
  price: number
  image_url: string
  participants: number
  created_at: string
  is_premium: boolean
  fruit_type: string
}

interface Coupon {
  name: string;
  value: string;
}

export default function Home() {
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()
  const [boxValues, setBoxValues] = useState<Coupon[]>([
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' },
    { name: '?', value: '?' }
  ])
  const [openedBoxes, setOpenedBoxes] = useState<number[]>([])
  const [selectedCoupons, setSelectedCoupons] = useState<Coupon[]>([])
  const [isBoxesRevealed, setIsBoxesRevealed] = useState(false)
  const [hasParticipatedEvent, setHasParticipatedEvent] = useState(false)
  const [displayMode, setDisplayMode] = useState<'grouped' | 'mixed' | 'budget' | 'budget10k' | 'over20k'>('mixed')
  const [isLoading, setIsLoading] = useState(true) // 새로운 상태 추가

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

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) console.error('Error logging in:', error)
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error logging out:', error)
  }

  const checkEventParticipation = useCallback(async (userId: string) => {
    setIsLoading(true) // 로딩 시작
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('is_evented')
        .eq('id', userId)
        .single()

      if (error) throw error

      setHasParticipatedEvent(data?.is_evented || false)
    } catch (error) {
      console.error('Error checking event participation:', error)
    } finally {
      setIsLoading(false) // 로딩 종료
    }
  }, [supabase])

  useEffect(() => {
    fetchFruits()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkEventParticipation(session.user.id)
      } else {
        setIsLoading(false) // 세션이 없으면 로딩 종료
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkEventParticipation(session.user.id)
      } else {
        setIsLoading(false) // 세션이 없으면 로딩 종료
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchFruits, checkEventParticipation])

  const getImageUrl = (path: string) => {
    if (!path) return '/images/placeholder-fruit.jpg'
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`
  }

  const renderFruitCard = (fruit: Fruit | null) => (
    <div className="bg-white rounded-lg overflow-hidden shadow-md h-full flex flex-col">
      {fruit ? (
        <Link href={`/fruit/${fruit.id}`} key={fruit.id} className="block h-full">
          <div className="relative aspect-square">
            <Image
              src={getImageUrl(fruit.image_url)}
              alt={fruit.name}
              layout="fill"
              objectFit="cover"
            />
            <div className="absolute top-0 right-0 flex flex-col items-end">
              <div className="bg-green-500 text-white px-1 py-0.5 text-[11px] font-bold rounded-bl-lg rounded-tl-lg mb-0.5">
                무료배송 O
              </div>
              <div className="bg-red-500 text-white px-1 py-0.5 text-[11px] font-bold rounded-bl-lg rounded-tl-lg">
                쿠폰사용 O
              </div>
            </div>
          </div>
          <div className="p-2 flex flex-col justify-between flex-grow">
            <h3 className="text-sm font-semibold mb-1 text-gray-800 line-clamp-2 h-10">
              {fruit.name}
            </h3>
            <div>
              <p className="text-base font-bold text-red-600">
                {fruit.price.toLocaleString()}원
              </p>
              <p className="text-xs text-green-600 font-semibold">무료배송</p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="h-full bg-white flex flex-col items-center justify-start pt-8">
          <p className="text-sm text-gray-500 text-center mb-1">새로운 상품이 곧 도착합니다!</p>
          <p className="text-sm text-gray-500 text-center">기대해 주세요.</p>
        </div>
      )}
    </div>
  )

  const groupFruitsByType = (fruits: Fruit[]) => {
    const grouped: { [key: string]: { regular: Fruit | null, premium: Fruit | null } } = {}
    fruits.forEach(fruit => {
      if (!grouped[fruit.fruit_type]) {
        grouped[fruit.fruit_type] = { regular: null, premium: null }
      }
      if (fruit.is_premium) {
        grouped[fruit.fruit_type].premium = fruit
      } else {
        grouped[fruit.fruit_type].regular = fruit
      }
    })
    return grouped
  }

  // const allFruits = groupFruitsByType(fruits)  // 이 줄을 주석 처리하거나 제거

  const getRandomCoupon = useCallback(() => {
    const coupons = [
      { name: '무료배송', value: '무료배송' },
      { name: '700원 할인', value: '700' },
      { name: '2900원 할인', value: '2900' },
      { name: '2800원 할인', value: '2800' },
      { name: '1000원 할인', value: '1000' },
      { name: '2000원 할인', value: '2000' },
      { name: '3000원 할인', value: '3000' }
    ]
    return coupons[Math.floor(Math.random() * coupons.length)]
  }, [])

  const calculateCoupons = useCallback(() => {
    const coupons: Coupon[] = []
    
    // 첫 번째 박스에 99% 확률로 무료배송 쿠폰 추가
    if (Math.random() < 0.99) {
      coupons.push({ name: '무료배송', value: '무료배송' })
    } else {
      coupons.push(getRandomCoupon())
    }

    // 나머지 5개 박스에 랜덤 쿠폰 추가
    for (let i = 1; i < 6; i++) {
      coupons.push(getRandomCoupon())
    }

    // 최종적으로 무작위로 섞기
    return coupons.sort(() => Math.random() - 0.5)
  }, [getRandomCoupon])

  useEffect(() => {
    const calculatedCoupons = calculateCoupons()
    setBoxValues(calculatedCoupons)
  }, [calculateCoupons])

  const selectBox = (index: number) => {
    if (openedBoxes.length >= 2) return  // 4에서 2로 변경
    
    const newOpenedBoxes = [...openedBoxes, index]
    setOpenedBoxes(newOpenedBoxes)
    
    const newSelectedCoupons = [...selectedCoupons, boxValues[index]]
    setSelectedCoupons(newSelectedCoupons)
    
    if (newOpenedBoxes.length === 2) {  // 4에서 2로 변경
      setIsBoxesRevealed(true)
    }
  }

  const saveCouponsToDatabase = async () => {
    if (!user) return

    const { error: updateError } = await supabase
      .from('customers')
      .update({ is_evented: true })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating event participation:', updateError)
      alert('쿠폰 저장 중 오류가 발생했습니다.')
      return
    }

    // 선택된 쿠폰들을 coupons 테이블에 저장
    const couponsToSave = selectedCoupons.map(coupon => ({
      user_id: user.id,
      coupon_type: coupon.name,
      coupon_value: coupon.value,
      is_used: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후 만료
    }))

    const { error: insertError } = await supabase
      .from('coupons')
      .insert(couponsToSave)

    if (insertError) {
      console.error('Error saving coupons:', insertError)
      alert('쿠폰 저장 중 오류가 발생했습니다.')
      return
    }

    setHasParticipatedEvent(true)
    alert('쿠폰이 성공적으로 저장되었습니다!')
  }

  const filterFruits = (fruits: Fruit[]) => {
    switch (displayMode) {
      case 'budget':
        return fruits.filter(fruit => fruit.price <= 10000)
      case 'budget10k':
        return fruits.filter(fruit => fruit.price > 10000 && fruit.price <= 20000)
      case 'over20k':
        return fruits.filter(fruit => fruit.price > 20000)
      default:
        return fruits
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <div className="bg-yellow-200 py-6 px-4 text-center">
        <p className="text-sm font-bold text-gray-800">🎉 특별 이벤트: 최초 1회 간편로그인하면 할인 박스 2개 개봉 기회! 🎁</p>
        <p className="text-xs text-gray-700 mt-2">지금 바로 가입하고 특별한 혜택을 만나보세요!</p>
        {!user && (
          <button onClick={handleLogin} className="mt-4 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            카카오로그인하고 혜택받기
          </button>
        )}
      </div>

      {/* 필터 버튼 수정 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap justify-center gap-2">
          
          <button
            onClick={() => setDisplayMode('mixed')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-full transition-colors duration-200 ${
              displayMode === 'mixed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setDisplayMode('budget')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-full transition-colors duration-200 ${
              displayMode === 'budget' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            1만원 이내
          </button>
          <button
            onClick={() => setDisplayMode('budget10k')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-full transition-colors duration-200 ${
              displayMode === 'budget10k' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            1만원대
          </button>
          <button
            onClick={() => setDisplayMode('over20k')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-full transition-colors duration-200 ${
              displayMode === 'over20k' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            2만원 이상
          </button>
          <button
            onClick={() => setDisplayMode('grouped')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-full transition-colors duration-200 ${
              displayMode === 'grouped' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            가성비/프리미엄
          </button>
        </div>
      </div>

      {!isLoading && user && !hasParticipatedEvent && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">랜덤박스 열기</h2>
          <p className="text-gray-600 mb-4">원하는 랜덤박스 2개를 선택해주세요!</p>  {/* 4에서 2로 변경 */}
          <div className="grid grid-cols-3 gap-4">
            {boxValues.map((coupon, index) => (
              <button
                key={index}
                onClick={() => selectBox(index)}
                disabled={openedBoxes.includes(index)}
                className={`w-full aspect-square ${
                  openedBoxes.includes(index)
                    ? 'bg-green-500'
                    : 'bg-yellow-400 hover:bg-yellow-500'
                } rounded-lg shadow-md flex items-center justify-center text-2xl font-bold text-white transition-colors`}
              >
                {openedBoxes.includes(index) ? coupon.name : '?'}
              </button>
            ))}
          </div>
        </div>
      )}
      {isBoxesRevealed && !hasParticipatedEvent && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">축하합니다!</h2>
          <p className="text-gray-600 mb-4">다음 쿠폰을 획득하셨습니다:</p>
          <ul className="list-disc list-inside mb-4">
            {selectedCoupons.map((coupon, index) => (
              <li key={index} className="text-lg text-green-600">{coupon.name}</li>
            ))}
          </ul>
          <button
            onClick={saveCouponsToDatabase}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            쿠폰 저장하기
          </button>
        </div>
      )}
      <main className="w-full px-2 py-6">
        {displayMode === 'grouped' ? (
          // 가성비/프리미엄 그룹화 방식
          Object.entries(groupFruitsByType(filterFruits(fruits))).map(([fruitType, groupedFruits]) => (
            <div key={fruitType} className="mb-8">
              <h2 className="text-2xl font-bold mb-4">{fruitType}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">가성비</h3>
                  {renderFruitCard(groupedFruits.regular)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">프리미엄</h3>
                  {renderFruitCard(groupedFruits.premium)}
                </div>
              </div>
            </div>
          ))
        ) : (
          // 다른 모든 방식 (혼합, 예산별)
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filterFruits(fruits).map((fruit) => (
              <div key={fruit.id}>
                {renderFruitCard(fruit)}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
