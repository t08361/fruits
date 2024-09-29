import { useState, useEffect } from 'react'

interface TimerProps {
  endTime: Date
}

export default function Timer({ endTime }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const difference = endTime.getTime() - now.getTime()

      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        const seconds = Math.floor((difference / 1000) % 60)

        setTimeLeft(`${hours}시간 ${minutes}분 ${seconds}초`)
      } else {
        setTimeLeft('판매 종료')
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime])

  return (
    <div className="text-lg font-semibold text-red-600">
      이벤트⚡️ 남은 시간: {timeLeft}
    </div>
  )
}