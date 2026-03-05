'use client'

import Link from 'next/link'
import { Wallet } from 'lucide-react'

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
          <Wallet size={48} className="text-teal-400" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">우리집 가계부</h1>
          <p className="text-gray-500 text-sm">부부가 함께 관리하는 스마트 가계부</p>
        </div>

        <div className="w-full space-y-3">
          <Link
            href="/create-family"
            className="block w-full py-3.5 rounded-2xl bg-teal-400 text-white text-center font-bold text-base"
          >
            새 가족 만들기
          </Link>
          <Link
            href="/join-family"
            className="block w-full py-3.5 rounded-2xl border-2 border-teal-400 text-teal-500 text-center font-bold text-base"
          >
            기존 가족 참여
          </Link>
        </div>
      </div>
    </div>
  )
}
