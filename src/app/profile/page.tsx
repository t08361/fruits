'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import RandomBox from '../../components/RandomBox'
import Script from 'next/script'
import Image from 'next/image'

interface Coupon {
  id: string
  coupon_type: string
  coupon_value: string
  expires_at: string
  is_used: boolean
}

interface Purchase {
  id: string
  fruit_name: string
  price: number
  shipping_address: string
  tracking_number: string | null
  created_at: string
  purchased_at: string
  fruit_image_url: string
  fruit_id: number // 이 줄 추가
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<{
    name: string;
    phone: string;
    address: string;
    detailAddress: string;
  }>({ name: '', phone: '', address: '', detailAddress: '' })
  const supabase = createClientComponentClient()
  const [showAllCoupons, setShowAllCoupons] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [copiedTrackingNumber, setCopiedTrackingNumber] = useState<string | null>(null)
  const [showRandomBox, setShowRandomBox] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showAllPurchases, setShowAllPurchases] = useState(false);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const [address, detailAddress] = (user.user_metadata?.address || '').split('||');
        setEditedUser({
          name: user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || '',
          address: address || '',
          detailAddress: detailAddress || '',
        })
        
        // 쿠폰 데이터 가져오기
        const { data: couponsData, error: couponsError } = await supabase
          .from('coupons')
          .select('*, user_name') // user_name 필드 추가
          .eq('user_id', user.id)
          .order('expires_at', { ascending: true })

        if (couponsError) {
          console.error('Error fetching coupons:', couponsError)
        } else {
          setCoupons(couponsData)
        }

        // 구매 내역 가져오기
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('purchases')
          .select('*, fruits(id, image_url)') // fruits 테이블에서 id와 image_url을 함께 가져옵니다.
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (purchasesError) {
          console.error('Error fetching purchases:', purchasesError)
        } else {
          setPurchases(purchasesData.map((purchase: any) => ({
            ...purchase,
            fruit_id: purchase.fruits.id,
            fruit_image_url: purchase.fruits.image_url
          })))
        }

        // 사용자가 랜덤박스를 열었는지 확인
        const { data: randomBoxData, error: randomBoxError } = await supabase
          .from('user_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_type', 'random_box_opened')
          .single()

        if (randomBoxError && randomBoxError.code !== 'PGRST116') {
          console.error('Error checking random box status:', randomBoxError)
        } else {
          setShowRandomBox(!randomBoxData)
        }
      }
      setLoading(false)
    }

    fetchUserAndData()
  }, [supabase])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const validatePhoneNumber = (phoneNumber: string) => {
    // 숫자만 추출
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // 휴대폰 번호 패턴 (010, 011, 016, 017, 018, 019로 시작하는 11자리 숫자)
    const mobilePattern = /^01[016789]\d{8}$/;
    
    // 일반 전화번호 패턴 (지역번호 + 7~8리 숫자)
    const landlinePattern = /^0(2|[3-6][1-5])\d{7,8}$/;
    
    if (mobilePattern.test(digitsOnly) || landlinePattern.test(digitsOnly)) {
      return { isValid: true, formattedNumber: digitsOnly };
    } else {
      return { isValid: false, formattedNumber: digitsOnly };
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const { isValid, formattedNumber } = validatePhoneNumber(inputValue);
    
    setEditedUser({ ...editedUser, phone: formattedNumber });
    
    if (!isValid) {
      setPhoneError('올바른 전화번호 형식이 아닙니다.');
    } else {
      setPhoneError(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const { isValid } = validatePhoneNumber(editedUser.phone);
    if (!isValid) {
      alert('올바른 전화번호를 입력해주세요.');
      return;
    }

    const fullAddress = `${editedUser.address}||${editedUser.detailAddress}`.trim();

    try {
      // 사용자 메타데이터 업데이트
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          name: editedUser.name,
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
          name: editedUser.name,
          phone: editedUser.phone,
          address: fullAddress,
        }, { onConflict: 'id' });

      if (updateCustomerError) throw updateCustomerError;

      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          name: editedUser.name,
          phone: editedUser.phone,
          address: fullAddress,
        }
      });
      setIsEditing(false);
      alert('프로필이 성공적으로 업데이트되었습니다.');

      // 사용자의 모든 쿠폰 업데이트
      const { error: updateCouponsError } = await supabase
        .from('coupons')
        .update({ user_name: editedUser.name })
        .eq('user_id', user.id);

      if (updateCouponsError) throw updateCouponsError;
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('프로필 업데이트 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false)
    setEditedUser({
      name: user?.user_metadata?.name || '',
      phone: user?.user_metadata?.phone || '',
      address: user?.user_metadata?.address || '',
      detailAddress: user?.user_metadata?.detailAddress || '',
    })
  }

  const toggleCouponsDisplay = () => {
    setShowAllCoupons(!showAllCoupons)
  }

  // 사용 가능한 쿠폰과 사용한 쿠폰을 분리하는 함수
  const separateCoupons = (coupons: Coupon[]) => {
    const available = coupons.filter(coupon => !coupon.is_used)
    const used = coupons.filter(coupon => coupon.is_used)
    return { available, used }
  }

  const calculateEstimatedDeliveryDate = (purchaseDate: string) => {
    const date = new Date(purchaseDate);
    date.setDate(date.getDate() + 2);
    return date.toLocaleDateString();
  };

  const copyToClipboard = useCallback((text: string, type: 'account' | 'tracking') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'account') {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        setCopiedTrackingNumber(text)
        setTimeout(() => setCopiedTrackingNumber(null), 2000)
      }
    }, (err) => {
      console.error('Failed to copy text: ', err)
    })
  }, [])

  const deliveryCompanies = [
    { name: '로젠택배', url: 'https://www.ilogen.com/m/personal/tkSearch.dev' },
    { name: 'CJ대한통운', url: 'https://www.cjlogistics.com/ko/tool/parcel/tracking' },
    { name: '한진택배', url: 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038' },
    { name: '우체국택배', url: 'https://service.epost.go.kr/iservice/usr/trace/usrtrc001k01.jsp' },
    { name: '롯데택배', url: 'https://www.lotteglogis.com/home/reservation/tracking/index' },
  ]

  const handleCouponsReceived = async (newCoupons: string[]) => {
    const newCouponsData = newCoupons.map(couponType => ({
      id: Math.random().toString(36).substr(2, 9),
      user_id: user?.id,
      user_name: user?.user_metadata?.name || '',  // 사용자 이름 추가
      coupon_type: couponType,
      coupon_value: couponType,
      is_used: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    setCoupons([...coupons, ...newCouponsData]);
    setShowRandomBox(false);

    // 쿠폰을 데이터베이스에 저장
    for (const coupon of newCouponsData) {
      const { error } = await supabase.from('coupons').insert(coupon);
      if (error) {
        console.error('Error saving coupon:', error);
      }
    }

    // 랜덤박스 열기 이벤트 기록
    const { error } = await supabase.from('user_events').insert({
      user_id: user?.id,
      event_type: 'random_box_opened',
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error recording random box event:', error);
    }
  };

  const handleDaumPostcode = () => {
    new (window as any).daum.Postcode({  // eslint-disable-line @typescript-eslint/no-explicit-any
      oncomplete: function(data: any) {  // eslint-disable-line @typescript-eslint/no-explicit-any
        setEditedUser({
          ...editedUser,
          address: data.address,
          detailAddress: ''
        });
      }
    }).open();
  }

  const isTransactionComplete = (purchase: Purchase) => {
    return !!purchase.tracking_number;
  };

  const sortedPurchases = purchases.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const displayedPurchases = showAllPurchases ? sortedPurchases : sortedPurchases.slice(0, 3);

  const getImageUrl = (path: string) => {
    if (!path) return '/images/placeholder-fruit.jpg'
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fruits/${path}`
  }

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  if (!user) {
    return <div className="text-center py-8">로그인이 필요합니다.</div>
  }

  const { available: availableCoupons, used: usedCoupons } = separateCoupons(coupons)

  return (
    <>
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" 
        strategy="lazyOnload"
      />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">사용자 프로필</h3>
              <Link href="/"
                className="inline-flex items-center px-10 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                홈으로
              </Link>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
                  <div className="mt-2">
                    {isEditing ? (
                      <>
                        <div className="mb-4">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">이름</label>
                          <input
                            id="name"
                            type="text"
                            value={editedUser.name}
                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="이름을 입력하세요"
                          />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">전화번호</label>
                          <input
                            id="phone"
                            type="tel"
                            value={editedUser.phone}
                            onChange={handlePhoneChange}
                            className={`mt-1 block w-full border ${phoneError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            placeholder="전화번호를 입력하세요"
                          />
                          {phoneError && <p className="mt-1 text-sm text-red-500">{phoneError}</p>}
                        </div>
                        <div className="mb-4">
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
                        <div className="mb-4">
                          <label htmlFor="detailAddress" className="block text-sm font-medium text-gray-700">상세 주소</label>
                          <input
                            type="text"
                            id="detailAddress"
                            value={editedUser.detailAddress}
                            onChange={(e) => setEditedUser({ ...editedUser, detailAddress: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="상세 주소를 입력하세요"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">이름: {user.user_metadata?.name || '이름 없음'}</p>
                        <p className="text-sm text-gray-500">이메일: {user.email}</p>
                        <p className="text-sm text-gray-500">전화번호: {user.user_metadata?.phone || '전화번호 없음'}</p>
                        <p className="text-sm text-gray-500">
                          주소: {user.user_metadata?.address ? user.user_metadata.address.replace('||', ' ') : '주 없음'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="mt-4">
                    {isEditing ? (
                      <div className="space-x-2">
                        <button
                          onClick={handleSave}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          disabled={!!phoneError}
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancel}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleEdit}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        수정하기
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">보유 쿠폰</h3>
                  <div className="mt-2">
                    {coupons.length > 0 ? (
                      <div>
                        <div 
                          onClick={toggleCouponsDisplay} 
                          className="cursor-pointer flex justify-between items-center p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-200"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {availableCoupons.length > 0 
                              ? `${availableCoupons[0].coupon_type} (${availableCoupons[0].coupon_value})`
                              : '사용 가능한 쿠폰 없음'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {showAllCoupons ? '접기' : `총 ${availableCoupons.length}개 쿠폰 보기`}
                          </span>
                        </div>
                        {showAllCoupons && (
                          <div className="mt-2 space-y-4">
                            {availableCoupons.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">사용 가능한 쿠폰</h4>
                                <ul className="space-y-1">
                                  {availableCoupons.map((coupon) => (
                                    <li key={coupon.id} className="text-sm text-gray-600">
                                      {coupon.coupon_type} ({coupon.coupon_value})
                                      <span className="ml-2 text-xs text-gray-500">
                                        만료: {new Date(coupon.expires_at).toLocaleDateString()}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {usedCoupons.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-1">사용한 쿠폰</h4>
                                <ul className="space-y-1">
                                  {usedCoupons.map((coupon) => (
                                    <li key={coupon.id} className="text-sm text-gray-400">
                                      {coupon.coupon_type} ({coupon.coupon_value})
                                      <span className="ml-2 text-xs">사용됨</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">보유 중인 쿠폰이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">구매 내역</h3>
              <div className="mt-2 mb-4 bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-700">입금 계좌</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-900">토스 뱅크 100031749372</p>
                  <button
                    onClick={() => copyToClipboard('100031749372', 'account')}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    {copySuccess ? '복사됨!' : '복사'}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                {purchases.length > 0 ? (
                  <>
                    <ul className="divide-y divide-gray-200">
                      {displayedPurchases.map((purchase) => (
                        <li key={purchase.id} className={`py-4 ${isTransactionComplete(purchase) ? 'bg-green-50' : 'bg-yellow-50'}`}>
                          <div className="flex items-center">
                            <Link href={`/fruit/${purchase.fruit_id}`} className="flex-shrink-0 mr-4">
                              <div className="relative w-16 h-16 rounded-md overflow-hidden">
                                <Image
                                  src={getImageUrl(purchase.fruit_image_url)}
                                  alt={purchase.fruit_name}
                                  layout="fill"
                                  objectFit="cover"
                                />
                              </div>
                            </Link>
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <Link href={`/fruit/${purchase.fruit_id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                                    {purchase.fruit_name}
                                  </Link>
                                  <p className="text-sm text-gray-500">구매 가격: {purchase.price.toLocaleString()}원</p>
                                  <p className="text-sm text-gray-500">배송 주소: {purchase.shipping_address}</p>
                                </div>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isTransactionComplete(purchase) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {isTransactionComplete(purchase) ? '거래 완료' : '거래 중'}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center">
                                  <p className="text-sm text-gray-500 mr-2">
                                    송장번호: {purchase.tracking_number || '배송 준비 중'}
                                  </p>
                                  {purchase.tracking_number && (
                                    <button
                                      onClick={() => copyToClipboard(purchase.tracking_number!, 'tracking')}
                                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                                    >
                                      {copiedTrackingNumber === purchase.tracking_number ? '복사됨!' : '복사'}
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  구매일: {new Date(purchase.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  배송완료 예정일: {calculateEstimatedDeliveryDate(purchase.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {purchases.length > 3 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowAllPurchases(!showAllPurchases)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {showAllPurchases ? '접기' : '더 보기'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">구매 내역이 없습니다.</p>
                )}
              </div>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">택배 조회</h3>
              <div className="grid grid-cols-5 gap-2">
                {deliveryCompanies.map((company) => (
                  <a
                    key={company.name}
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-xs text-gray-600"
                  >
                    {company.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        {showRandomBox && user && (
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <RandomBox userId={user.id} onCouponsReceived={handleCouponsReceived} />
          </div>
        )}
      </div>
    </>
  )
}
