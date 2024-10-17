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
  const [paymentMethod] = useState<string>('무통장 입금') // 결제 방법을 무통장 입금으로 고정
  const supabase = createClientComponentClient()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id
  const [pendingCoupons, setPendingCoupons] = useState<Coupon[]>([])
  const [shippingFee] = useState(3000); // setShippingFee 제거
  const [showCoupons, setShowCoupons] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [editedUser, setEditedUser] = useState({
    phone: '',
    address: '',
  })
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [finalPrice, setFinalPrice] = useState(0)
  const [copySuccess, setCopySuccess] = useState(false)

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
      setEditedUser({
        phone: userData?.user_metadata?.phone || '',
        address: userData?.user_metadata?.address || '',
      })

      // 프로필 완성 여부 확인
      setIsProfileComplete(
        !!userData?.user_metadata?.phone && 
        !!userData?.user_metadata?.address
      )

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
  }, [supabase, id, searchParams])

  const calculateDiscountedPrice = (price: number, coupons: Coupon[]) => {
    let discountedPrice = price;
    const discountSteps: string[] = [];
    let totalDiscount = 0;
    let isShippingFree = false;
    let shippingDiscount = 0;

    coupons.forEach((coupon, index) => {
      if (coupon.value === '무료배송') {
        isShippingFree = true;
        shippingDiscount = shippingFee;
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
    totalDiscount += shippingDiscount; // 배송비 할인을 총 할인 금액에 추가

    return { finalPrice, steps: discountSteps, totalDiscount, isShippingFree, finalShippingFee };
  }

  const toggleCoupon = (coupon: Coupon) => {
    setSelectedCoupons((prevSelected) => {
      const isAlreadySelected = prevSelected.some((c) => c.id === coupon.id);
      if (isAlreadySelected) {
        return prevSelected.filter((c) => c.id !== coupon.id);
      } else {
        const isDiscountCoupon = coupon.value !== '무료배송';
        const isShippingCoupon = coupon.value === '무료배송';
        
        // 이미 금액 할인 쿠폰이 선택되어 있는지 확인
        const hasDiscountCoupon = prevSelected.some((c) => c.value !== '무료배송');
        // 이미 무료배송 쿠폰이 선택되어 있는지 확인
        const hasShippingCoupon = prevSelected.some((c) => c.value === '무료배송');

        if ((isDiscountCoupon && hasDiscountCoupon) || (isShippingCoupon && hasShippingCoupon)) {
          // 이미 같은 종류의 쿠폰이 선택되어 있으면 기존 쿠폰을 제거하고 새 쿠폰을 추가
          return [
            ...prevSelected.filter((c) => 
              (isDiscountCoupon && c.value === '무료배송') || 
              (isShippingCoupon && c.value !== '무료배송')
            ),
            coupon
          ];
        } else {
          // 아직 해당 종류의 쿠폰이 선택되지 않았으면 새 쿠폰을 추가
          return [...prevSelected, coupon];
        }
      }
    });
  };

  const handlePurchase = async () => {
    if (!user || !fruit) return;

    try {
      // 선택된 쿠폰을 사용한 것으로 표시
      for (const coupon of selectedCoupons) {
        const { error } = await supabase
          .from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', coupon.id)

        if (error) {
          console.error(`쿠폰 "${coupon.name}" 사용 중 오류:`, error);
          throw new Error(`쿠폰 "${coupon.name}" ��용 중 오류가 발생했습니다.`);
        }
      }

      // 최종 가격 계산
      const { finalPrice } = calculateDiscountedPrice(fruit.price, selectedCoupons);

      // 구매 정보를 데이터베이스에 저장
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          fruit_id: fruit.id,
          fruit_name: fruit.name,
          price: finalPrice,
          payment_method: paymentMethod,
          coupons_used: selectedCoupons.map(c => c.name).join(', '),
          shipping_address: user.user_metadata?.address || '',
          created_at: new Date().toISOString()
        })
        .select()

      if (purchaseError) {
        console.error('구매 정보 저장 중 오류:', purchaseError);
        throw new Error('구매 정보 저장 중 오류가 발생했습니다.');
      }

      console.log('구매 정보 저장 성공:', purchaseData);

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
          console.error('쿠폰 저장 중 오류:', error);
        }
      }

      // 구매 성공 후 상태 업데이트
      setFinalPrice(finalPrice)
      setPurchaseComplete(true)

    } catch (error) {
      console.error('구매 처리 중 오류 발생:', error);
      alert(error instanceof Error ? error.message : '구매 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  const handleEdit = async () => {
    if (!user) return

    const { error } = await supabase.auth.updateUser({
      data: {
        phone: editedUser.phone,
        address: editedUser.address,
      }
    })

    if (error) {
      console.error('Error updating user:', error)
      alert('사용자 정보 업데이트 중 오류가 발생했습니다.')
    } else {
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...editedUser
        }
      })
      setIsProfileComplete(true)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }, (err) => {
      console.error('Failed to copy text: ', err)
    })
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
                <button
                  onClick={() => setShowCoupons(!showCoupons)}
                  className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 flex justify-between items-center"
                >
                  <span>사용 가능한 쿠폰 {availableCoupons.length}개</span>
                  <svg
                    className={`w-5 h-5 transform transition-transform duration-200 ${showCoupons ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCoupons && (
                  <div className="mt-2 space-y-2">
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
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">결제 방법</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-700">무통장 입금</p>
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
            
            {!isProfileComplete && (
              <div className="space-y-4">
                <p className="text-red-500 font-medium text-sm">
                  전화번호와 주소를 입력해주셔야 구매가 가능하십니다!
                </p>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">전화번호</label>
                  <input
                    type="tel"
                    id="phone"
                    value={editedUser.phone}
                    onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="전화번호를 입력하세요"
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">배송 주소</label>
                  <input
                    type="text"
                    id="address"
                    value={editedUser.address}
                    onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="배송 주소를 입력하세요"
                  />
                </div>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  수정하기
                </button>
              </div>
            )}
            
            {purchaseComplete ? (
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                <p className="font-bold">구매 성공하였습니다.</p>
                <p>입금 계좌</p>
                <div className="flex items-center space-x-2">
                  <p className="font-bold">토스 뱅크 100031749372</p>
                  <button
                    onClick={() => copyToClipboard('100031749372')}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    {copySuccess ? '복사됨!' : '복사'}
                  </button>
                </div>
                <p>로 {finalPrice.toLocaleString()}원 입금해주시면</p>
                <p>구매가 완료됩니다.</p>
                <p>입금 확인 후 물건 보내드리겠습니다.</p>
                <Link href="/" className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                  홈으로 돌아가기
                </Link>
              </div>
            ) : (
              isProfileComplete && (
                <button
                  onClick={handlePurchase}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  구매하기
                </button>
              )
            )}
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
