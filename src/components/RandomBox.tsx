import React, { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface RandomBoxProps {
  userId: string
  onCouponsReceived: (coupons: string[]) => void
}

const RandomBox: React.FC<RandomBoxProps> = ({ userId, onCouponsReceived }) => {
  const [isOpening, setIsOpening] = useState(false)
  const [openedCoupons, setOpenedCoupons] = useState<string[]>([])
  const supabase = createClientComponentClient()

  const openRandomBox = async () => {
    setIsOpening(true)
    const coupons = []
    for (let i = 0; i < 2; i++) {
      const coupon = getRandomCoupon()
      coupons.push(coupon)
      await saveCouponToDatabase(coupon)
    }
    setOpenedCoupons(coupons)
    onCouponsReceived(coupons)
    setIsOpening(false)
  }

  const getRandomCoupon = () => {
    const coupons = [
      '무료배송',
      '10% 할인',
      '15% 할인',
      '20% 할인',
      '1000원 할인',
      '2000원 할인',
      '3000원 할인'
    ]
    return coupons[Math.floor(Math.random() * coupons.length)]
  }

  const saveCouponToDatabase = async (couponType: string) => {
    const { error } = await supabase.from('coupons').insert({
      user_id: userId,
      coupon_type: couponType,
      coupon_value: couponType,
      is_used: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후 만료
    })

    if (error) {
      console.error('Error saving coupon:', error)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">랜덤박스 열기</h3>
      {openedCoupons.length === 0 ? (
        <button
          onClick={openRandomBox}
          disabled={isOpening}
          className="bg-purple-500 text-white px-4 py-2 rounded-full hover:bg-purple-600 transition-colors"
        >
          {isOpening ? '여는 중...' : '랜덤박스 열기'}
        </button>
      ) : (
        <div>
          <p className="mb-2">축하합니다! 다음 쿠폰을 받았습니다:</p>
          <ul className="list-disc list-inside">
            {openedCoupons.map((coupon, index) => (
              <li key={index} className="text-green-600 font-semibold">{coupon}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default RandomBox
