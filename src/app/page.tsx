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
    const { data, error } = await supabase
      .from('customers')
      .select('is_evented')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking event participation:', error)
    } else {
      setHasParticipatedEvent(data.is_evented)
    }
  }, [supabase])

  useEffect(() => {
    fetchFruits()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkEventParticipation(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkEventParticipation(session.user.id)
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
          </div>
          <div className="p-2 flex flex-col justify-between flex-grow">
            <h3 className="text-sm font-semibold mb-1 text-gray-800 line-clamp-2">{fruit.name}</h3>
            <p className="text-xs text-gray-600">가격: {fruit.price.toLocaleString()}원</p>
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

  const allFruits = groupFruitsByType(fruits)

  const affordableMessages = [
    "너만 잘났냐? 나도 가성비로는 인기짱이야!",
    "너는 비싼 옷 입었지만, 난 누구나 쉽게 만나볼 수 있지!",
    "프리미엄이라고 너무 잘난 척 하지 마~ 맛은 나도 만만하지 않다고!",
    "난 부담 없는 가격으로 맛도 충분히 낸다구!",
    "넌 귀족, 난 서민! 하지만 모두 날 사랑해!",
    "난 가격 대비 성능 최고! 너는 너무 비싸서 좀 부담스러워~",
    "너처럼 비싸지 않아도 사람들은 날 충분히 사랑해!",
    "너는 멋지긴 해도, 난 일상에서 항상 함께하는 친구야!",
    "프리미엄이라고 해서 다 좋은 건 아니야, 내 매력은 실속이야!",
    "넌 특별한 날만 등장하지만, 난 언제든 불러주기만 하면 돼!",
    "내가 이렇게 사랑받는 이유는 바로 '합리적 소비'야, 알아두라고!",
    "너는 럭셔리지만 난 편안하게 즐길 수 있는 친근함이 있어!"
  ];

  const premiumMessages = [
    "가성비는 좋아도, 퀄리티는 내가 한 수 위지!",
    "너도 언젠간 나처럼 될 수 있을 거야, 힘내!",
    "그냥 나처럼 좀 더 고급지게 살아봐, 세상이 달라져!",
    "가성비 좋다는 건 인정, 하지만 난 특별한 날에만 선택받지!",
    "맛도 중요하지만, 품격은 따라올 수 없지 않겠니?",
    "네가 가성비 좋다지만, 품격은 나를 따라올 수 없지!",
    "난 말 그대로 '프리미엄'이잖아! 모두 날 맛보면 그 차이를 알지!",
    "그래, 네가 인기 있는 건 인정, 하지만 나만의 고급스러움은 넘 수 없다고!",
    "넌 대중이라 좋겠지만, 난 선택받은 사람들만 찾는다구!",
    "언젠가는 너도 나처럼 고급지게 변신하고 싶지 않겠니?",
    "난 단 한 입만 먹어봐도 잊을 수 없는 맛을 자랑하지!",
    "그래, 넌 가성비가 최고야, 하지만 난 그 이상의 가치를 주는 거라구!"
  ];

  const getRandomMessage = (messages: string[]) => {
    return messages[Math.floor(Math.random() * messages.length)];
  };

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
    if (openedBoxes.length >= 2) return
    
    const newOpenedBoxes = [...openedBoxes, index]
    setOpenedBoxes(newOpenedBoxes)
    
    const newSelectedCoupons = [...selectedCoupons, boxValues[index]]
    setSelectedCoupons(newSelectedCoupons)
    
    if (newOpenedBoxes.length === 2) {
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <div className="bg-yellow-400 py-6 px-4 text-center">
        <p className="text-xl font-bold text-gray-800">🎉 특별 이벤트: 가입만 해도 무료배송 쿠폰 3개 + 랜덤박스 2개 열기 기회! 🎁</p>
        <p className="text-base text-gray-700 mt-2">지금 바로 가입하고 특별한 혜택을 만나보세요!</p>
        {!user && (
          <button onClick={handleLogin} className="mt-4 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            간편 가입하고 혜택받기
          </button>
        )}
      </div>
      {user && !hasParticipatedEvent && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">랜덤박스 열기</h2>
          <p className="text-gray-600 mb-4">원하는 랜덤박스 2개를 선택해주세요!</p>
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
        <div className="space-y-4">
          {Object.entries(allFruits).map(([fruitType, { regular, premium }]) => (
            <div key={fruitType} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-base font-bold text-green-600 mb-1 text-center">가성비 상품</h4>
                    <p className="text-xs text-gray-500 mb-2 font-sans h-10 flex items-center text-left">
                      {regular ? getRandomMessage(affordableMessages) : ""}
                    </p>
                    {renderFruitCard(regular)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-purple-600 mb-1 text-center">프리미엄 상품</h4>
                    <p className="text-xs text-gray-500 mb-2 font-sans h-10 flex items-center text-left">
                      {premium ? getRandomMessage(premiumMessages) : ""}
                    </p>
                    {renderFruitCard(premium)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
