'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import QRCode from 'react-qr-code'
import { createFamily } from '@/src/lib/supabase/queries'
import { useFamilyStore } from '@/src/lib/store/familyStore'

export default function CreateFamilyPage() {
  const router = useRouter()
  const { setFamily, setMember } = useFamilyStore()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ familyCode: string } | null>(null)

  async function handleCreate() {
    if (!nickname.trim()) return
    setLoading(true)
    try {
      const { family, member } = await createFamily(nickname.trim())
      setFamily(family)
      setMember(member)
      setResult({ familyCode: family.family_code })
    } catch {
      alert('가족 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <CheckCircle size={56} className="text-teal-400" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">가족이 만들어졌어요!</h2>
            <p className="text-gray-600 text-sm mt-1">아래 코드로 가족을 초대하세요</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 w-full">
            <p className="text-3xl font-bold tracking-[0.3em] text-teal-500">
              {result.familyCode}
            </p>
            <QRCode value={result.familyCode} size={160} className="mx-auto" />
          </div>
          <button
            onClick={() => router.push('/home/transactions')}
            className="w-full py-3.5 rounded-2xl bg-teal-400 text-white font-bold text-base"
          >
            시작하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex items-center px-4 py-3 border-b">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-3 font-bold text-lg">새 가족 만들기</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-gray-600">닉네임</label>
          <input
            type="text"
            placeholder="사용할 닉네임을 입력하세요"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!nickname.trim() || loading}
          className="w-full py-3.5 rounded-2xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {loading ? '생성 중...' : '가족 만들기'}
        </button>
      </div>
    </div>
  )
}
