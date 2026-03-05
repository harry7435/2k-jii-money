'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, QrCode, Users, Trash2, LogOut } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useFamilyStore } from '@/src/lib/store/familyStore'
import { getCategories, getMembers, deleteCategory } from '@/src/lib/supabase/queries'
import { CategoryIcon } from '@/src/components/CategoryIcon'

export default function SettingsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { family, member, clear } = useFamilyStore()
  const [showQR, setShowQR] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [copied, setCopied] = useState(false)

  const familyId = family?.id ?? ''

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', familyId],
    queryFn: () => getMembers(familyId),
    enabled: !!familyId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', familyId] }),
  })

  function handleCopy() {
    if (!family) return
    navigator.clipboard.writeText(family.family_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLeave() {
    if (!confirm('정말 나가시겠습니까?')) return
    clear()
    router.replace('/welcome')
  }

  if (!family || !member) return null

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 프로필 */}
      <div className="flex items-center gap-4 px-5 py-6 bg-white border-b">
        <div className="w-14 h-14 rounded-full bg-teal-400 flex items-center justify-center text-white text-2xl font-bold">
          {member.nickname[0]}
        </div>
        <div>
          <p className="font-bold text-lg">{member.nickname}</p>
          <p className="text-xs text-gray-400">가족 코드: {family.family_code}</p>
        </div>
      </div>

      {/* 가족 정보 */}
      <div className="bg-white mt-2 px-5 py-4 border-b space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase">가족 정보</p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">가족 코드</span>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-teal-500">{family.family_code}</span>
            <button onClick={handleCopy} className="text-gray-400 hover:text-teal-400">
              <Copy size={16} />
            </button>
            <button onClick={() => setShowQR(true)} className="text-gray-400 hover:text-teal-400">
              <QrCode size={16} />
            </button>
          </div>
        </div>
        {copied && <p className="text-xs text-teal-500">코드가 복사되었습니다!</p>}

        <button
          onClick={() => setShowMembers(true)}
          className="flex items-center justify-between w-full"
        >
          <span className="text-sm text-gray-700">가족 구성원</span>
          <div className="flex items-center gap-1 text-gray-400">
            <Users size={16} />
            <span className="text-sm">{members.length}명</span>
          </div>
        </button>
      </div>

      {/* 카테고리 관리 */}
      <div className="bg-white mt-2 px-5 py-4 border-b">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">카테고리 관리</p>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
              <span className="flex-1 text-sm">{cat.name}</span>
              {cat.is_default ? (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">기본</span>
              ) : (
                <button
                  onClick={() => deleteMutation.mutate(cat.id)}
                  className="text-gray-300 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="bg-white mt-2 px-5 py-4">
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 text-red-500 text-sm"
        >
          <LogOut size={16} />
          가족에서 나가기
        </button>
      </div>

      {/* QR 모달 */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowQR(false)}
        >
          <div className="bg-white rounded-2xl p-8 space-y-4 flex flex-col items-center">
            <p className="font-bold">가족 코드 QR</p>
            <QRCode value={family.family_code} size={200} />
            <p className="text-2xl font-bold tracking-[0.3em] text-teal-500">{family.family_code}</p>
            <p className="text-xs text-gray-400">탭하여 닫기</p>
          </div>
        </div>
      )}

      {/* 멤버 목록 모달 */}
      {showMembers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowMembers(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-72 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold">가족 구성원</p>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm">
                  {m.nickname[0]}
                </div>
                <span className="text-sm">{m.nickname}</span>
                {m.id === member.id && (
                  <span className="text-[10px] bg-teal-50 text-teal-500 px-2 py-0.5 rounded-full ml-auto">나</span>
                )}
              </div>
            ))}
            <button
              onClick={() => setShowMembers(false)}
              className="w-full py-2 rounded-xl bg-gray-100 text-sm text-gray-600 mt-2"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
