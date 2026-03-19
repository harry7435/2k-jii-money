'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, QrCode, Users, Trash2, LogOut, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useFamilyStore } from '@/src/lib/store/familyStore'
import {
  getCategories,
  getMembers,
  deleteCategory,
  addCategory,
  getPaymentSources,
  addPaymentSource,
  deletePaymentSource,
} from '@/src/lib/supabase/queries'
import { CategoryIcon } from '@/src/components/CategoryIcon'
import { getCategoriesByLevel, getChildCategories } from '@/src/lib/utils/categoryUtils'
import type { Category, PaymentSource } from '@2k-jii-money/supabase-types'

export default function SettingsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { family, member, clear } = useFamilyStore()

  const [showQR, setShowQR] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [copied, setCopied] = useState(false)

  // 카테고리 관리 상태
  const [expandedMajor, setExpandedMajor] = useState<string | null>(null)
  const [expandedMiddle, setExpandedMiddle] = useState<string | null>(null)
  const [addingSubOf, setAddingSubOf] = useState<string | null>(null) // 소분류 추가 중인 중분류 ID
  const [newSubName, setNewSubName] = useState('')

  // 거래출처 관리 상태
  const [newSourceName, setNewSourceName] = useState('')
  const [addingSource, setAddingSource] = useState(false)

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

  const { data: paymentSources = [] } = useQuery({
    queryKey: ['paymentSources', familyId],
    queryFn: () => getPaymentSources(familyId),
    enabled: !!familyId,
  })

  const deleteCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', familyId] }),
  })

  const addSubMutation = useMutation({
    mutationFn: ({ parentId, name }: { parentId: string; name: string }) => {
      const parentCat = categories.find((c) => c.id === parentId)
      return addCategory(familyId, name, parentCat?.icon ?? 'label', parentCat?.color ?? '#BDC3C7', parentId, 3)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', familyId] })
      setAddingSubOf(null)
      setNewSubName('')
    },
  })

  const addSourceMutation = useMutation({
    mutationFn: (name: string) => addPaymentSource(familyId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paymentSources', familyId] })
      setNewSourceName('')
      setAddingSource(false)
    },
  })

  const deleteSourceMutation = useMutation({
    mutationFn: deletePaymentSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paymentSources', familyId] }),
  })

  const majorCategories = useMemo(() => getCategoriesByLevel(categories, 1), [categories])

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
      <div className="flex items-center gap-4 px-5 py-6 bg-white border-b border-gray-100">
        <div className="w-14 h-14 rounded-full bg-teal-400 flex items-center justify-center text-white text-2xl font-bold">
          {member.nickname[0]}
        </div>
        <div>
          <p className="font-bold text-lg">{member.nickname}</p>
          <p className="text-xs text-gray-500">가족 코드: {family.family_code}</p>
        </div>
      </div>

      {/* 가족 정보 */}
      <div className="bg-white mt-2 px-5 py-4 border-b border-gray-100 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">가족 정보</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">가족 코드</span>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-teal-500">{family.family_code}</span>
            <button onClick={handleCopy} className="text-gray-500 hover:text-teal-400">
              <Copy size={16} />
            </button>
            <button onClick={() => setShowQR(true)} className="text-gray-500 hover:text-teal-400">
              <QrCode size={16} />
            </button>
          </div>
        </div>
        {copied && <p className="text-xs text-teal-500">코드가 복사되었습니다!</p>}

        <button onClick={() => setShowMembers(true)} className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-700">가족 구성원</span>
          <div className="flex items-center gap-1 text-gray-500">
            <Users size={16} />
            <span className="text-sm">{members.length}명</span>
          </div>
        </button>
      </div>

      {/* ─── 카테고리 관리 ─────────────────────────────── */}
      <div className="bg-white mt-2 px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">카테고리 관리</p>
        <p className="text-xs text-gray-400 mb-3">소분류는 추가/삭제할 수 있어요. 대·중분류는 기본 제공됩니다.</p>

        <div className="space-y-1">
          {majorCategories.map((major) => {
            const middleList = getChildCategories(categories, major.id)
            const isOpenMajor = expandedMajor === major.id

            return (
              <div key={major.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* 대분류 행 */}
                <button
                  onClick={() => setExpandedMajor(isOpenMajor ? null : major.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <CategoryIcon icon={major.icon} color={major.color} size="sm" />
                  <span className="flex-1 text-sm font-semibold text-left">{major.name}</span>
                  <span className="text-xs text-gray-400">{middleList.length}개 중분류</span>
                  {isOpenMajor ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </button>

                {/* 중분류 목록 */}
                {isOpenMajor && (
                  <div className="divide-y divide-gray-50">
                    {middleList.map((middle) => {
                      const subList = getChildCategories(categories, middle.id)
                      const isOpenMiddle = expandedMiddle === middle.id

                      return (
                        <div key={middle.id}>
                          {/* 중분류 행 */}
                          <button
                            onClick={() => setExpandedMiddle(isOpenMiddle ? null : middle.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                          >
                            <CategoryIcon icon={middle.icon} color={middle.color} size="sm" />
                            <span className="flex-1 text-sm text-left">{middle.name}</span>
                            <span className="text-xs text-gray-400">{subList.length}개</span>
                            {isOpenMiddle ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                          </button>

                          {/* 소분류 목록 */}
                          {isOpenMiddle && (
                            <div className="px-4 pb-2 space-y-1">
                              {subList.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-2 pl-2 py-1">
                                  <span className="flex-1 text-xs text-gray-600">{sub.name}</span>
                                  {sub.is_default ? (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">기본</span>
                                  ) : (
                                    <button
                                      onClick={() => deleteCatMutation.mutate(sub.id)}
                                      className="text-gray-300 hover:text-red-400"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}

                              {/* 소분류 추가 */}
                              {addingSubOf === middle.id ? (
                                <div className="flex items-center gap-2 pl-2 pt-1">
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="소분류 이름"
                                    value={newSubName}
                                    onChange={(e) => setNewSubName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newSubName.trim()) {
                                        addSubMutation.mutate({ parentId: middle.id, name: newSubName.trim() })
                                      }
                                      if (e.key === 'Escape') {
                                        setAddingSubOf(null)
                                        setNewSubName('')
                                      }
                                    }}
                                    className="flex-1 text-xs border border-teal-300 rounded-lg px-2 py-1 outline-none"
                                  />
                                  <button
                                    disabled={!newSubName.trim() || addSubMutation.isPending}
                                    onClick={() => addSubMutation.mutate({ parentId: middle.id, name: newSubName.trim() })}
                                    className="text-xs text-teal-500 font-medium disabled:opacity-40"
                                  >
                                    추가
                                  </button>
                                  <button
                                    onClick={() => { setAddingSubOf(null); setNewSubName('') }}
                                    className="text-xs text-gray-400"
                                  >
                                    취소
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setAddingSubOf(middle.id); setExpandedMiddle(middle.id) }}
                                  className="flex items-center gap-1 pl-2 py-1 text-xs text-teal-500 hover:text-teal-600"
                                >
                                  <Plus size={12} />
                                  소분류 추가
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── 거래출처 관리 ─────────────────────────────── */}
      <div className="bg-white mt-2 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">거래출처 관리</p>
          <button
            onClick={() => setAddingSource(true)}
            className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-600"
          >
            <Plus size={13} />
            추가
          </button>
        </div>

        <div className="space-y-2">
          {paymentSources.map((ps: PaymentSource) => (
            <div key={ps.id} className="flex items-center gap-3 py-1">
              <span className="material-symbols-outlined text-base text-gray-400">credit_card</span>
              <span className="flex-1 text-sm">{ps.name}</span>
              {ps.is_default ? (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">기본</span>
              ) : (
                <button
                  onClick={() => deleteSourceMutation.mutate(ps.id)}
                  className="text-gray-300 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {addingSource && (
            <div className="flex items-center gap-2 pt-1">
              <input
                autoFocus
                type="text"
                placeholder="거래출처 이름 (예: 체크카드)"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSourceName.trim()) {
                    addSourceMutation.mutate(newSourceName.trim())
                  }
                  if (e.key === 'Escape') {
                    setAddingSource(false)
                    setNewSourceName('')
                  }
                }}
                className="flex-1 text-sm border border-teal-300 rounded-xl px-3 py-1.5 outline-none"
              />
              <button
                disabled={!newSourceName.trim() || addSourceMutation.isPending}
                onClick={() => addSourceMutation.mutate(newSourceName.trim())}
                className="text-sm text-teal-500 font-medium disabled:opacity-40"
              >
                추가
              </button>
              <button
                onClick={() => { setAddingSource(false); setNewSourceName('') }}
                className="text-sm text-gray-400"
              >
                취소
              </button>
            </div>
          )}

          {paymentSources.length === 0 && !addingSource && (
            <p className="text-xs text-gray-400">등록된 거래출처가 없어요</p>
          )}
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="bg-white mt-2 px-5 py-4 mb-4">
        <button onClick={handleLeave} className="flex items-center gap-2 text-red-500 text-sm">
          <LogOut size={16} />
          가족에서 나가기
        </button>
      </div>

      {/* QR 모달 */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-8 space-y-4 flex flex-col items-center">
            <p className="font-bold">가족 코드 QR</p>
            <QRCode value={family.family_code} size={200} />
            <p className="text-2xl font-bold tracking-[0.3em] text-teal-500">{family.family_code}</p>
            <p className="text-xs text-gray-500">탭하여 닫기</p>
          </div>
        </div>
      )}

      {/* 멤버 목록 모달 */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMembers(false)}>
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
            <button onClick={() => setShowMembers(false)} className="w-full py-2 rounded-xl bg-gray-100 text-sm text-gray-600 mt-2">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
