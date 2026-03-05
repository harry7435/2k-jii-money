'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { findFamilyByCode, joinFamily } from '@/src/lib/supabase/queries'
import { useFamilyStore } from '@/src/lib/store/familyStore'
import type { Family } from '@2k-jii-money/supabase-types'

type Step = 'code' | 'found'

export default function JoinFamilyPage() {
  const router = useRouter()
  const { setFamily, setMember } = useFamilyStore()
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [foundFamily, setFoundFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFind() {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      const family = await findFamilyByCode(code)
      if (!family) {
        setError('가족 코드를 찾을 수 없습니다.')
        return
      }
      setFoundFamily(family)
      setStep('found')
    } catch {
      setError('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!foundFamily || !nickname.trim()) return
    setLoading(true)
    try {
      const member = await joinFamily(foundFamily.id, nickname.trim())
      setFamily(foundFamily)
      setMember(member)
      router.push('/home/transactions')
    } catch {
      alert('참여에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-3 font-bold text-lg">기존 가족 참여</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        {step === 'code' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">가족 코드 (6자리)</label>
              <input
                type="text"
                placeholder="예: A3BK2X"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400 tracking-widest text-center text-xl font-bold uppercase"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <button
              onClick={handleFind}
              disabled={code.length < 6 || loading}
              className="w-full py-3.5 rounded-2xl bg-teal-400 text-white font-bold disabled:opacity-40"
            >
              {loading ? '찾는 중...' : '코드로 찾기'}
            </button>
          </div>
        )}

        {step === 'found' && (
          <div className="space-y-6 text-center">
            <CheckCircle size={56} className="text-teal-400 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">가족을 찾았어요!</h2>
              <p className="text-gray-600 text-sm mt-1">닉네임을 입력하고 참여하세요</p>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm text-gray-600">닉네임</label>
              <input
                type="text"
                placeholder="사용할 닉네임을 입력하세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!nickname.trim() || loading}
              className="w-full py-3.5 rounded-2xl bg-teal-400 text-white font-bold disabled:opacity-40"
            >
              {loading ? '참여 중...' : '참여하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
