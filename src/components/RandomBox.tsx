import React from 'react'

interface RandomBoxProps {
  userId: string | undefined
}

const RandomBox: React.FC<RandomBoxProps> = ({ userId }) => {
  return (
    <div>
      {/* RandomBox 컴포넌트의 내용을 여기에 작성하세요 */}
      <p>Random Box for user: {userId}</p>
    </div>
  )
}

export default RandomBox
