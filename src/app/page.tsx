'use client'

import React from 'react'
import { useEffect, useState, useCallback } from 'react'
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

export default function Home() {
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

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

  useEffect(() => {
    fetchFruits()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [fetchFruits, supabase])

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
        <div className="h-full bg-white flex items-center justify-center p-4">
          {/* 빈 상태일 때 아무 내용도 표시하지 않음 */}
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
    "프리미엄이라고 너무 잘난 척 하지 마~ 맛은 나도 만만치 않다고!",
    "난 부담 없는 가격으로 맛도 충분히 낸다구!",
    "넌 귀족, 난 서민! 하지만 두 날 사랑해!",
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
    "그래, 네가 인기 있는 건 인정, 하지만 나만의 고급스러움은 넘볼 수 없다고!",
    "넌 대중이라 좋겠지만, 난 선택받은 사람들만 찾는다구!",
    "언젠가는 너도 나처럼 고급지게 변신하고 싶지 않겠니?",
    "난 단 한 입만 먹어봐도 잊을 수 없는 맛을 자랑하지!",
    "그래, 넌 가성비가 최고야, 하지만 난 그 이상의 가치를 주는 거라구!"
  ];

  const getRandomMessage = (messages: string[]) => {
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {Object.entries(allFruits).map(([fruitType, { regular, premium }]) => (
            <div key={fruitType} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <h3 className="text-sm font-semibold p-2 bg-gray-50 border-b text-black">
                {fruitType}
              </h3>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-medium text-green-600 mb-1">가성비 상품</h4>
                    <p className="text-xs text-gray-500 mb-2 font-sans">
                      {regular ? getRandomMessage(affordableMessages) : ""}
                    </p>
                    {renderFruitCard(regular)}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-purple-600 mb-1">프리미엄 상품</h4>
                    <p className="text-xs text-gray-500 mb-2 font-sans">
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
