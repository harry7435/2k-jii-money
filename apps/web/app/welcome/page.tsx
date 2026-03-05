'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { findFamilyByCode, getMembers } from '@/src/lib/supabase/queries'
import { useFamilyStore } from '@/src/lib/store/familyStore'
import type { Family, Member } from '@2k-jii-money/supabase-types'

type Step = 'password' | 'member'

export default function WelcomePage() {
  const router = useRouter()
  const { setFamily, setMember } = useFamilyStore()
  const [step, setStep] = useState<Step>('password')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [familyData, setFamilyData] = useState<Family | null>(null)
  const [members, setMembers] = useState<Member[]>([])

  async function handlePasswordSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '비밀번호가 틀렸습니다.')
        return
      }

      const familyCode = process.env.NEXT_PUBLIC_FAMILY_CODE
      if (!familyCode) {
        setError('서버 설정 오류 (NEXT_PUBLIC_FAMILY_CODE 미설정)')
        return
      }

      const loaded = await findFamilyByCode(familyCode)
      if (!loaded) {
        setError('가족 정보를 불러올 수 없습니다.')
        return
      }

      const loadedMembers = await getMembers(loaded.id)
      setFamilyData(loaded)
      setMembers(loadedMembers)
      setStep('member')
    } catch {
      setError('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleMemberSelect(member: Member) {
    if (!familyData) return
    setFamily(familyData)
    setMember(member)
    router.push('/home/transactions')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
          <Wallet size={48} className="text-teal-400" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">우리집 가계부</h1>
          <p className="text-gray-600 text-sm">부부가 함께 관리하는 스마트 가계부</p>
        </div>

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="w-full space-y-3">
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400 text-center placeholder:text-gray-500"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={!password || loading}
              className="block w-full py-3.5 rounded-2xl bg-teal-400 text-white text-center font-bold text-base disabled:opacity-40"
            >
              {loading ? '확인 중...' : '입장하기'}
            </button>
          </form>
        )}

        {step === 'member' && (
          <div className="w-full space-y-3">
            <p className="text-center text-sm text-gray-600 font-semibold">누구로 입장할까요?</p>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => handleMemberSelect(m)}
                className="block w-full py-3.5 rounded-2xl border-2 border-teal-400 text-teal-600 text-center font-bold text-base"
              >
                {m.nickname}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
