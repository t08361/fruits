import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirect') || '/'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // 새로운 사용자인지 확인
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id, is_first_login')
        .eq('id', data.user.id)
        .single()

      if (customerError && customerError.code === 'PGRST116') {
        // 새로운 사용자라면 무료배송 쿠폰 3개 지급 및 사용자 정보 저장
        await giveFreeCoupons(supabase, data.user.id)
        await supabase.from('customers').insert({
          id: data.user.id,
          is_first_login: true
        })
      }
    }
  }

  // 로그인 후 지정된 페이지로 리다이렉트
  return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`)
}

async function giveFreeCoupons(supabase, userId: string) {
  const coupons = Array(3).fill({
    user_id: userId,
    coupon_type: '무료배송',
    coupon_value: '무료배송',
    is_used: false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후 만료
  })

  const { error } = await supabase.from('coupons').insert(coupons)

  if (error) {
    console.error('Error giving free coupons:', error)
  }
}
