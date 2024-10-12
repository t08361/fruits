'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'

interface Fruit {
  id: number
  name: string
  price: number
  image_url: string
}

interface User {
  id: string
  email: string
  user_metadata?: {
    name?: string
    phone?: string
    address?: string
  }
}

interface Coupon {
  id: number
  name: string
  discount: number
}

export default function PurchasePage() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('카카오페이')
  const supabase = createClientComponentClient()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id
  const selectedPrice = searchParams ? searchParams.get('price') : null

  useEffect(() => {
    const fetchData = async () => {
      // 과일 정보 가져오기
      const { data: fruitData, error: fruitError } = await supabase
        .from('fruits')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fruitError) {
        console.error('Error fetching fruit:', fruitError)
        return
      }
      setFruit(fruitData)

      // 사용자 정보 가져오기
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error fetching user:', userError)
        return
      }
      setUser(userData as User)

      // 쿠폰 정��� 가져오기 (예시 데이터)
      setCoupons([
        { id: 1, name: '10% 할인 쿠폰', discount: 10 },
        { id: 2, name: '5% 할인 쿠폰', discount: 5 },
      ])
    }

    fetchData()
  }, [id, supabase])

  const handlePurchase = () => {
    // 여기에 실제 구매 로직을 구현합니다.
    alert('구매가 완료되었습니다!')
    router.push('/')
  }

  if (!fruit || !user) {
    return <div>로딩 중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900">구매 정보</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">상품 정보</h3>
              <div className="mt-2 flex items-center">
                <div className="flex-shrink-0 h-24 w-24 relative">
                  <Image
                    src={fruit.image_url}
                    alt={fruit.name}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                  />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">{fruit.name}</p>
                  <p className="text-sm text-gray-500">{selectedPrice ? parseInt(selectedPrice).toLocaleString() : fruit.price.toLocaleString()}원</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">구매자 정보</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">이름: {user.user_metadata?.name || '이름 없음'}</p>
                <p className="text-sm text-gray-500">이메일: {user.email}</p>
                <p className="text-sm text-gray-500">전화번호: {user.user_metadata?.phone || '전화번호 없음'}</p>
                <p className="text-sm text-gray-500">주소: {user.user_metadata?.address || '주소 없음'}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">쿠폰 선택</h3>
              <select
                className="mt-2 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedCoupon?.id || ''}
                onChange={(e) => setSelectedCoupon(coupons.find(c => c.id === parseInt(e.target.value)) || null)}
              >
                <option value="">쿠폰을 선택하세요</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>{coupon.name}</option>
                ))}
              </select>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">결제 방법</h3>
              <div className="mt-2 space-y-2">
                {['카카오페이', '네이버페이', '토스'].map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-5 sm:px-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900">
              총 결제 금액: {((selectedPrice ? parseInt(selectedPrice) : fruit.price) * (1 - (selectedCoupon?.discount || 0) / 100)).toLocaleString()}원
            </span>
            <button
              onClick={handlePurchase}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              구매하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
