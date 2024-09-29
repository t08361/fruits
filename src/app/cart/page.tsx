'use client'

import { useEffect, useState, useCallback } from 'react'
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

  const fetchCartItems = useCallback(async () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}')
    const ids = Object.keys(cart).map(Number)
    if (ids.length === 0) return

    const { data, error } = await supabase
      .from('fruits')
      .select('id, name, price')
      .in('id', ids)
    
    if (error) {
      console.error('장바구니 아이템 조회 중 오류 발생:', error)
    } else {
      setCartItems(data.map(item => ({
        ...item,
        quantity: cart[item.id]
      })))
    }
  }, [supabase])

  useEffect(() => {
    fetchCartItems()
  }, [fetchCartItems])

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return

    const cart = JSON.parse(localStorage.getItem('cart') || '{}')
    cart[id] = newQuantity
    localStorage.setItem('cart', JSON.stringify(cart))

    setCartItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const removeItem = (id: number) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}')
    delete cart[id]
    localStorage.setItem('cart', JSON.stringify(cart))

    setCartItems(prev => prev.filter(item => item.id !== id))
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="min-h-screen p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">장바구니</h1>
      {cartItems.length > 0 ? (
        <div>
          <ul>
            {cartItems.map(item => (
              <li key={item.id} className="mb-4 flex items-center justify-between">
                <span>{item.name} - {item.price.toLocaleString()}원</span>
                <div>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="bg-gray-200 px-2 py-1 rounded">-</button>
                  <span className="mx-2">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="bg-gray-200 px-2 py-1 rounded">+</button>
                  <button onClick={() => removeItem(item.id)} className="ml-4 bg-red-500 text-white px-2 py-1 rounded">삭제</button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-bold">총액: {total.toLocaleString()}원</p>
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