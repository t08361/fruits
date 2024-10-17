'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

interface Coupon {
  id: string
  coupon_type: string
  coupon_value: string
  expires_at: string
  is_used: boolean
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<{
    name: string;
    phone: string;
    address: string;
  }>({ name: '', phone: '', address: '' })
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUserAndCoupons = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        setEditedUser({
          name: user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || '',
          address: user.user_metadata?.address || '',
        })
        const { data: couponsData, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('user_id', user.id)
          .order('expires_at', { ascending: true })

        if (error) {
          console.error('Error fetching coupons:', error)
        } else {
          setCoupons(couponsData)
        }
      }
      setLoading(false)
    }

    fetchUserAndCoupons()
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

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  if (!user) {
    return <div className="text-center py-8">로그인이 필요합니다.</div>
  }

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
                  <ul className="space-y-2">
                    {coupons.map((coupon) => (
                      <li key={coupon.id} className="text-sm text-gray-700">
                        {coupon.coupon_type} ({coupon.coupon_value})
                        <span className="ml-2 text-xs text-gray-500">
                          {coupon.is_used ? '(사용됨)' : `(만료: ${new Date(coupon.expires_at).toLocaleDateString()})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">보유 중인 쿠폰이 없습니다.</p>
                )}
              </div>
            </div>
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
