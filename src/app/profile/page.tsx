'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
// import Image from 'next/image'  // 이 줄을 제거하거나 주석 처리

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
  }>({ name: '', phone: '', address: '' })
  const supabase = createClientComponentClient()
  const [showAllCoupons, setShowAllCoupons] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [copiedTrackingNumber, setCopiedTrackingNumber] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        setEditedUser({
          name: user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || '',
          address: user.user_metadata?.address || '',
        })
        
        // 쿠폰 데이터 가져오기
        const { data: couponsData, error: couponsError } = await supabase
          .from('coupons')
          .select('*')
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
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (purchasesError) {
          console.error('Error fetching purchases:', purchasesError)
        } else {
          setPurchases(purchasesData)
        }
      }
      setLoading(false)
    }

    fetchUserAndData()
  }, [supabase])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!user) return

    const { error } = await supabase.auth.updateUser({
      data: {
        name: editedUser.name,
        phone: editedUser.phone,
        address: editedUser.address,
      }
    })

    if (error) {
      console.error('Error updating user:', error)
    } else {
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...editedUser
        }
      })
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedUser({
      name: user?.user_metadata?.name || '',
      phone: user?.user_metadata?.phone || '',
      address: user?.user_metadata?.address || '',
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

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  if (!user) {
    return <div className="text-center py-8">로그인이 필요합니다.</div>
  }

  const { available: availableCoupons, used: usedCoupons } = separateCoupons(coupons)

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900">사용자 프로필</h2>
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
                        onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="전화번호를 입력하세요"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">배송 주소</label>
                      <input
                        id="address"
                        type="text"
                        value={editedUser.address}
                        onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="배송 주소를 입력하세요"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">이름: {user.user_metadata?.name || '이름 없음'}</p>
                    <p className="text-sm text-gray-500">이메일: {user.email}</p>
                    <p className="text-sm text-gray-500">전화번호: {user.user_metadata?.phone || '전화번호 없음'}</p>
                    <p className="text-sm text-gray-500">배송 주소: {user.user_metadata?.address || '주소 없음'}</p>
                  </>
                )}
              </div>
              <div className="mt-4">
                {isEditing ? (
                  <div className="space-x-2">
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                        {showAllCoupons ? '접기' : `총 ${coupons.length}개 쿠폰 보기`}
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
                            <h4 className="text-sm font-medium text-gray-700 mb-1">사용한 쿠폰</h4>
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
              <ul className="divide-y divide-gray-200">
                {purchases.map((purchase) => (
                  <li key={purchase.id} className="py-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{purchase.fruit_name}</p>
                        <p className="text-sm text-gray-500">구매 가격: {purchase.price.toLocaleString()}원</p>
                        <p className="text-sm text-gray-500">배송 주소: {purchase.shipping_address}</p>
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
                          배송완료 예정일: {calculateEstimatedDeliveryDate(purchase.created_at)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        구매일: {new Date(purchase.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
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
        <div className="bg-gray-50 px-4 py-5 sm:px-6 flex justify-between">
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
