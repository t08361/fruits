'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Script from 'next/script'

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
  const supabase = createClientComponentClient()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id
  const [pendingCoupons, setPendingCoupons] = useState<Coupon[]>([])
  const [shippingFee] = useState(3000)
  const [showCoupons, setShowCoupons] = useState(false)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [editedUser, setEditedUser] = useState({
    phone: '',
    address: '',
    detailAddress: '',
  })
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [finalPrice, setFinalPrice] = useState(0)
  const [copySuccess, setCopySuccess] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [isEditingShippingInfo, setIsEditingShippingInfo] = useState(false)

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
      const [address, detailAddress] = (userData?.user_metadata?.address || '').split('||');
      setEditedUser({
        phone: userData?.user_metadata?.phone || '',
        address: address || '',
        detailAddress: detailAddress || '',
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
          // 아직 해당 종의 쿠폰이 선택되지 않았으면 새 쿠폰을 추가
          return [...prevSelected, coupon];
        }
      }
    });
  };

  const validateAddress = () => {
    if (!editedUser.address.trim()) {
      setAddressError('주소를 요.');
      return false;
    }
    if (!editedUser.detailAddress.trim()) {
      setAddressError('상세 주소를 입력해주세요.');
      return false;
    }
    setAddressError(null);
    return true;
  };

  const handlePurchase = async () => {
    if (!user || !fruit) return;

    if (!validateAddress()) {
      alert('주소를 올바르게 입력해주세요.');
      return;
    }

    const fullAddress = `${editedUser.address}||${editedUser.detailAddress}`.trim();
    const finalPrice = calculateDiscountedPrice(fruit.price, selectedCoupons).finalPrice;

    try {
      // purchases 테이블에 구매 정보 추가
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          fruit_id: fruit.id,
          fruit_name: fruit.name,
          price: finalPrice,
          shipping_address: fullAddress,
          buyer_name: user.user_metadata?.name || '',
          buyer_phone: editedUser.phone,
          buyer_address: fullAddress,
          payment_method: '무통장 입금',
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // 사용한 쿠폰 업데이트
      for (const coupon of selectedCoupons) {
        const { error: couponError } = await supabase
          .from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', coupon.id);

        if (couponError) throw couponError;
      }

      // 새로운 쿠폰 발급
      for (const coupon of pendingCoupons) {
        const { error: newCouponError } = await supabase
          .from('coupons')
          .insert({
            user_id: user.id,
            user_name: user.user_metadata?.name || '',  // 사용자 이름 추가
            coupon_type: coupon.name,
            coupon_value: coupon.value,
            is_used: false,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후 만료
          });

        if (newCouponError) throw newCouponError;
      }

      // 사용자 메타데이터 업데이트
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          phone: editedUser.phone,
          address: fullAddress,
        }
      });

      if (updateUserError) throw updateUserError;

      // customers 테이블 업데이트
      const { error: updateCustomerError } = await supabase
        .from('customers')
        .upsert({
          id: user.id,
          name: user.user_metadata?.name || '',
          phone: editedUser.phone,
          address: fullAddress,
        }, { onConflict: 'id' });

      if (updateCustomerError) throw updateCustomerError;

      setPurchaseComplete(true);
      setFinalPrice(finalPrice);
      alert('구매가 완료되었습니다. 입금을 진행해 주세요.');
    } catch (error) {
      console.error('Error during purchase:', error);
      alert('구매 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value.replace(/[^0-9]/g, '');
    setEditedUser({ ...editedUser, phone: phoneNumber });
    
    if (phoneNumber.length !== 11) {
      setPhoneError('전화번호는 11자리 숫자여야 합니다.');
    } else {
      setPhoneError(null);
    }
  };

  const handleEdit = async () => {
    if (!user) return;

    if (editedUser.phone.length !== 11) {
      alert('올바른 전화번호를 입력해주세요.');
      return;
    }

    if (!validateAddress()) {
      return;
    }

    const fullAddress = `${editedUser.address}||${editedUser.detailAddress}`.trim();

    try {
      // 사용자 메타데이터 업데이트
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          phone: editedUser.phone,
          address: fullAddress,
        }
      });

      if (updateUserError) throw updateUserError;

      // customers 테이블 업데이트
      const { error: updateCustomerError } = await supabase
        .from('customers')
        .upsert({
          id: user.id,
          name: user.user_metadata?.name || '',
          phone: editedUser.phone,
          address: fullAddress,
        }, { onConflict: 'id' });

      if (updateCustomerError) throw updateCustomerError;

      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          phone: editedUser.phone,
          address: fullAddress,
        }
      });
      setIsProfileComplete(true);
      setIsEditingShippingInfo(false);
      alert('배송 정보가 성공적으로 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('배송 정보 업데이트 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }, (err) => {
      console.error('Failed to copy text: ', err)
    })
  }

  const openTossApp = () => {
    // 토스 앱으로 이동하는 URL
    const tossAppUrl = 'supertoss://';
    // 토스 웹사이트 URL (앱이 설치되어 있지 않은 경우를 위한 대체 URL)
    const tossWebUrl = 'https://toss.im';

    // 먼저 앱으로 이동을 시도하고, 실패하면 웹사이트로 이동
    setTimeout(() => {
      window.location.href = tossWebUrl;
    }, 500);
    window.location.href = tossAppUrl;
  };

  const handleDaumPostcode = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).daum.Postcode({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oncomplete: function(data: any) {
        setEditedUser({
          ...editedUser,
          address: data.address,
          detailAddress: ''
        });
      }
    }).open()
  }

  if (!fruit || !user) {
    return <div>로딩 중...</div>
  }

  return (
    <>
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" 
        strategy="lazyOnload"
      />
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
                  <p className="text-sm text-gray-500">
                    주소: {user.user_metadata?.address ? user.user_metadata.address.replace('||', ' ') : '주소 없음'}
                  </p>
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
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">배송 정보</h3>
              {isEditingShippingInfo ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">전화번호</label>
                    <input
                      type="tel"
                      id="phone"
                      value={editedUser.phone}
                      onChange={handlePhoneChange}
                      className={`mt-1 block w-full border ${phoneError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="전화번호를 입력하세요 (11자리)"
                    />
                    {phoneError && <p className="mt-1 text-sm text-red-500">{phoneError}</p>}
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">주소</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="address"
                        value={editedUser.address}
                        readOnly
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                        placeholder="주소를 검색하세요"
                      />
                      <button
                        type="button"
                        onClick={handleDaumPostcode}
                        className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm"
                      >
                        주소 검색
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="detailAddress" className="block text-sm font-medium text-gray-700">상세 주소</label>
                    <input
                      type="text"
                      id="detailAddress"
                      value={editedUser.detailAddress}
                      onChange={(e) => setEditedUser({ ...editedUser, detailAddress: e.target.value })}
                      className={`mt-1 block w-full border ${addressError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="상세 주소를 입력하세요"
                    />
                  </div>
                  {addressError && <p className="mt-1 text-sm text-red-500">{addressError}</p>}
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={!!phoneError || editedUser.phone.length !== 11 || !editedUser.address || !editedUser.detailAddress}
                  >
                    배송 정보 업데이트
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">전화번호: {user.user_metadata?.phone || '전화번호 없음'}</p>
                  <p className="text-sm text-gray-600">
                    주소: {user.user_metadata?.address ? user.user_metadata.address.replace('||', ' ') : '주소 없음'}
                  </p>
                  <button
                    onClick={() => setIsEditingShippingInfo(true)}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    배송 정보 수정
                  </button>
                </div>
              )}
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
                    화번호와 주를 입력해주셔야 매가 가능하니다!
                  </p>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">전화번호</label>
                    <input
                      type="tel"
                      id="phone"
                      value={editedUser.phone}
                      onChange={handlePhoneChange}
                      className={`mt-1 block w-full border ${phoneError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="전화번호를 입력하세요 (11자리)"
                    />
                    {phoneError && <p className="mt-1 text-sm text-red-500">{phoneError}</p>}
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">주소</label>
                    <input
                      type="text"
                      id="address"
                      value={editedUser.address}
                      onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                      className={`mt-1 block w-full border ${addressError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="주소를 입력하세요"
                    />
                  </div>
                  <div>
                    <label htmlFor="detailAddress" className="block text-sm font-medium text-gray-700">상세 주소</label>
                    <input
                      type="text"
                      id="detailAddress"
                      value={editedUser.detailAddress}
                      onChange={(e) => setEditedUser({ ...editedUser, detailAddress: e.target.value })}
                      className={`mt-1 block w-full border ${addressError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="상세 주소를 입력하세요"
                    />
                  </div>
                  {addressError && <p className="mt-1 text-sm text-red-500">{addressError}</p>}
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={!!phoneError || editedUser.phone.length !== 11 || !editedUser.address || !editedUser.detailAddress}
                  >
                    입력완료
                  </button>
                </div>
              )}
              
              {purchaseComplete ? (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                  <p className="font-bold text-lg mb-2">구매가 완료되었습니다.</p>
                  <p className="mb-2">무통장 입금 계좌</p>
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="font-bold">토스 뱅크 100031749372</p>
                    <button
                      onClick={() => copyToClipboard('100031749372')}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                    >
                      {copySuccess ? '복사됨!' : '복사'}
                    </button>
                  </div>
                  <p className="text-xl font-bold mb-2">
                    입금 금액: <span className="text-red-600">{finalPrice.toLocaleString()}원</span>
                  </p>
                  <p className="mb-2">위 계좌로 입금해 주시면 구매가 완료됩니다.</p>
                  <p className="text-sm text-red-500 font-medium mb-4">1시간 안에 입금이 확인되지 않으면 자동 구매취소 됩니다.</p>
                  <button
                    onClick={openTossApp}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200"
                  >
                    토스로 이동하여 송금하기
                  </button>
                </div>
              ) : (
                isProfileComplete && (
                  <button
                    onClick={handlePurchase}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={!isProfileComplete || !editedUser.address || !editedUser.detailAddress}
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
    </>
  )
}
