'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}')
    fetchCartItems(cart)
  }, [])

  async function fetchCartItems(cart: {[key: number]: number}) {
    const ids = Object.keys(cart).map(Number)
    if (ids.length === 0) return

    const { data, error } = await supabase
      .from('fruits')
      .select('*')
      .in('id', ids)
    
    if (error) console.log('error', error)
    else {
      setCartItems(data.map(item => ({
        ...item,
        quantity: cart[item.id]
      })))
    }
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="min-h-screen p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">장바구니</h1>
      {cartItems.length > 0 ? (
        <div>
          <ul>
            {cartItems.map(item => (
              <li key={item.id} className="mb-4">
                <p>{item.name} - {item.price}원 x {item.quantity} = {item.price * item.quantity}원</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-bold">총액: {total}원</p>
          <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
            결제하기
          </button>
        </div>
      ) : (
        <p>장바구니가 비어있습니다.</p>
      )}
      <Link href="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded">
        쇼핑 계속하기
      </Link>
    </div>
  )
}