import { NextResponse } from 'next/server'

export async function GET(/* request: Request */) {
  return NextResponse.json({ message: "Hello from verify-payment API route" })
}

export async function POST(/* request: Request */) {
  // 결제 검증 로직을 여기에 구현하세요
  return NextResponse.json({ message: "Payment verification not implemented yet" })
}
