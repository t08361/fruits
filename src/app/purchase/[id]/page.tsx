'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

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
  id: string;  // 쿠폰의 고유 ID 추가
  name: string
  value: string
}

interface DatabaseCoupon {
  id: string
  user_id: string
  coupon_type: string
  coupon_value: string
  is_used: boolean
  created_at: string
  expires_at: string
  used_at: string | null
}

export default function PurchasePage() {
  const [fruit, setFruit] = useState<Fruit | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [selectedCoupons, setSelectedCoupons] = useState<Coupon[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('카카오페이')
  const supabase = createClientComponentClient()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id
  const [pendingCoupons, setPendingCoupons] = useState<Coupon[]>([])
  const [shippingFee, setShippingFee] = useState(3000); // 기본 배송비 상태 추가

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

      // 사용자의 사용 가능한 쿠폰 가져오기
      if (userData) {
        const { data: couponsData, error: couponsError } = await supabase
          .from('coupons')
          .select('*')
          .eq('user_id', userData.id)
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString());

        if (couponsError) {
          console.error('Error fetching coupons:', couponsError);
        } else {
          const availableCoupons: Coupon[] = couponsData.map((coupon: DatabaseCoupon) => ({
            id: coupon.id,  // 쿠폰의 고유 ID 추가
            name: coupon.coupon_type,
            value: coupon.coupon_value,
          }));
          setAvailableCoupons(availableCoupons);
        }
      }

      // URL에서 쿠폰 정보 가져오기
      if (searchParams) {
        const couponsParam = searchParams.get('coupons')
        if (couponsParam) {
          try {
            const decodedParam = decodeURIComponent(couponsParam)
            const decodedCoupons = JSON.parse(decodedParam) as Coupon[]
            setPendingCoupons(decodedCoupons)
          } catch (error) {
            console.error('쿠폰 정보 디코딩 중 오류 발생:', error)
            // 오류 발생 시 사용자에게 알림을 표시하거나 다른 처리를 할 수 있습니다.
            // 예: setError('쿠폰 정보를 불러오는 데 실패했습니다.')
          }
        }
      }
    }

    fetchData()
  }, [id, supabase, searchParams])

  const calculateDiscountedPrice = (price: number, coupons: Coupon[]) => {
    let discountedPrice = price;
    let discountSteps: string[] = [];
    let totalDiscount = 0;
    let isShippingFree = false;

    coupons.forEach((coupon, index) => {
      if (coupon.value === '무료배송') {
        isShippingFree = true;
        discountSteps.push(`${index + 1}. 무료배송 쿠폰 적용 (-${shippingFee.toLocaleString()}원)`);
      } else if (coupon.value.endsWith('%')) {
        const discountPercentage = parseInt(coupon.value);
        const discountAmount = Math.round(discountedPrice * (discountPercentage / 100));
        discountedPrice -= discountAmount;
        totalDiscount += discountAmount;
        discountSteps.push(`${index + 1}. ${coupon.value} 할인: -${discountAmount.toLocaleString()}원 (남은 금액: ${discountedPrice.toLocaleString()}원)`);
      } else {
        const discountAmount = parseInt(coupon.value);
        discountedPrice = Math.max(0, discountedPrice - discountAmount);
        totalDiscount += discountAmount;
        discountSteps.push(`${index + 1}. ${discountAmount.toLocaleString()}원 할인 (남은 금액: ${discountedPrice.toLocaleString()}원)`);
      }
    });

    const finalShippingFee = isShippingFree ? 0 : shippingFee;
    const finalPrice = discountedPrice + finalShippingFee;

    return { finalPrice, steps: discountSteps, totalDiscount, isShippingFree, finalShippingFee };
  }

  const toggleCoupon = (coupon: Coupon) => {
    setSelectedCoupons(prev => {
      const existingIndex = prev.findIndex(c => c.id === coupon.id);
      if (existingIndex !== -1) {
        // 이미 선택된 쿠폰이면 제거
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // 선택되지 않은 쿠폰이면 추가
        return [...prev, coupon];
      }
    });
  };

  const handlePurchase = async () => {
    if (!user || !fruit) return;

    try {
      // 선택된 쿠폰을 사용한 것으로 표시
      for (const coupon of selectedCoupons) {
        const { data, error } = await supabase
          .from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', coupon.id)  // 쿠폰의 고유 ID로 업데이트
          .select()

        if (error) {
          console.error(`쿠폰 "${coupon.name}" 사용 중 오류:`, error);
          throw new Error(`쿠폰 "${coupon.name}" 사용 중 오류가 발생했습니다.`);
        }

        if (data.length === 0) {
          throw new Error(`쿠폰 "${coupon.name}"을(를) 찾을 수 없거나 이미 사용되었습니다.`);
        }
      }

      // 구매 정보를 데이터베이스에 저장
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          fruit_id: fruit.id,
          price: calculateDiscountedPrice(fruit.price, selectedCoupons).finalPrice,
          payment_method: paymentMethod,
          coupons_used: selectedCoupons.map(c => c.name).join(', ')
        });

      if (purchaseError) {
        throw new Error('구매 정보 저장 중 오류가 발생했습니다.');
      }

      // 랜덤박스에서 얻은 쿠폰을 데이터베이스에 저장
      for (const coupon of pendingCoupons) {
        const { error } = await supabase.from('coupons').insert({
          user_id: user.id,
          coupon_type: coupon.name,
          coupon_value: coupon.value,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후 만료
          is_used: false
        });

        if (error) {
          console.error('Error saving coupon:', error);
        }
      }

      alert('구매가 완료되었습니다!');
      router.push('/');
    } catch (error) {
      console.error('구매 처리 중 오류 발생:', error);
      alert(error instanceof Error ? error.message : '구매 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900">{fruit.name}</p>
                <p className="text-sm text-gray-500">{fruit.price.toLocaleString()}원</p>
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
              <h3 className="text-lg font-medium text-gray-900">사용 가능한 쿠폰</h3>
              <div className="mt-2">
                {availableCoupons.length > 0 ? (
                  availableCoupons.map((coupon) => (
                    <div key={coupon.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`coupon-${coupon.id}`}
                        checked={selectedCoupons.some(c => c.id === coupon.id)}
                        onChange={() => toggleCoupon(coupon)}
                        className="form-checkbox h-4 w-4 text-indigo-600"
                      />
                      <label htmlFor={`coupon-${coupon.id}`} className="text-sm text-gray-700">
                        {coupon.name} ({coupon.value})
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">사용 가능한 쿠폰 없음</p>
                )}
              </div>
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
          <div className="flex flex-col space-y-4">
            <div className="text-lg font-medium text-gray-900">
              <p>상품 가격: {fruit?.price.toLocaleString()}원</p>
              <p>기본 배송비: {shippingFee.toLocaleString()}원</p>
              {selectedCoupons.length > 0 && (
                <>
                  <ul className="list-none text-sm text-gray-600 mt-2">
                    {calculateDiscountedPrice(fruit?.price || 0, selectedCoupons).steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                  <p className="mt-2 font-bold">
                    총 할인 금액: {calculateDiscountedPrice(fruit?.price || 0, selectedCoupons).totalDiscount.toLocaleString()}원
                  </p>
                  <p className="mt-2">
                    배송비: {calculateDiscountedPrice(fruit?.price || 0, selectedCoupons).finalShippingFee.toLocaleString()}원
                    {calculateDiscountedPrice(fruit?.price || 0, selectedCoupons).isShippingFree && ' (무료배송 적용)'}
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    최종 결제 금액: {calculateDiscountedPrice(fruit?.price || 0, selectedCoupons).finalPrice.toLocaleString()}원
                  </p>
                </>
              )}
            </div>
            
            {pendingCoupons.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">구매 시 얻게 되는 쿠폰(구매 취소 시 쿠폰은 사라집니다):</h4>
                <ul className="space-y-1">
                  {pendingCoupons.map((coupon, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-center">
                      <span className="text-green-500 font-bold mr-2">+</span>
                      {coupon.name} ({coupon.value})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              onClick={handlePurchase}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              구매하기
            </button>
          </div>
        </div>
        <div className="px-4 py-5 sm:px-6 flex justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            이전으로
          </button>
          <Link href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
