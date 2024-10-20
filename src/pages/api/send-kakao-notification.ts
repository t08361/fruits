import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { phoneNumber, purchaseInfo } = req.body

    try {
      // 카카오 알림톡 API 엔드포인트
      const kakaoApiUrl = 'https://kapi.kakao.com/v1/api/talk/friends/message/default/send'

      // 카카오 API 액세스 토큰 (실제 토큰으로 교체해야 함)
      const accessToken = process.env.KAKAO_ACCESS_TOKEN

      // 알림톡 템플릿 ID (실제 템플릿 ID로 교체해야 함)
      const templateId = 'your_template_id'

      // 알림톡 내용
      const message = {
        object_type: 'text',
        text: `${purchaseInfo.fruitName} 구매가 완료되었습니다.\n결제 금액: ${purchaseInfo.price}원\n입금 계좌: 토스뱅크 ${purchaseInfo.accountNumber}\n주문번호: ${purchaseInfo.purchaseId}`,
        link: {
          web_url: `${process.env.NEXT_PUBLIC_BASE_URL}/purchase/${purchaseInfo.purchaseId}`,
          mobile_web_url: `${process.env.NEXT_PUBLIC_BASE_URL}/purchase/${purchaseInfo.purchaseId}`,
        },
      }

      // 카카오 알림톡 API 호출
      const response = await axios.post(
        kakaoApiUrl,
        {
          template_id: templateId,
          receiver_uuids: JSON.stringify([phoneNumber]),
          template_args: JSON.stringify(message),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      res.status(200).json({ success: true, data: response.data })
    } catch (error) {
      console.error('Error sending Kakao notification:', error)
      res.status(500).json({ success: false, error: 'Failed to send Kakao notification' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
