"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  QrCode,
  Users,
  Trash2,
  LogOut,
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import { createClient } from "@/src/lib/supabase/client";
import {
  getCategories,
  getMembers,
  deleteCategory,
  countTransactionsByCategories,
  addCategory,
  updateCategory,
  getPaymentSources,
  addPaymentSource,
  deletePaymentSource,
  insertMissingSubCategories,
  createInvite,
  resetFamilyData,
} from "@/src/lib/supabase/queries";
import { CategoryIcon } from "@/src/components/CategoryIcon";
import {
  getCategoriesByLevel,
  getChildCategories,
  getCategoryIdsWithDescendants,
} from "@/src/lib/utils/categoryUtils";
import { SettingsSkeleton } from "@/src/components/skeletons/SettingsSkeleton";
import type { PaymentSource } from "@2k-jii-money/supabase-types";

export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, member, clear } = useFamilyStore();

  const [showQR, setShowQR] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [copied, setCopied] = useState(false);

  // 초대 링크는 발급했을 때만 화면에 남는다. 토큰이라 다시 볼 필요가 없다.
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [resetting, setResetting] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const passwordMismatch =
    newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm;
  const canChangePassword =
    newPassword.length >= 6 &&
    newPasswordConfirm.length > 0 &&
    !passwordMismatch;

  // 카테고리 관리 상태
  const [expandedMajor, setExpandedMajor] = useState<string | null>(null);
  const [expandedMiddle, setExpandedMiddle] = useState<string | null>(null);
  const [addingSubOf, setAddingSubOf] = useState<string | null>(null); // 소분류 추가 중인 중분류 ID
  const [newSubName, setNewSubName] = useState("");
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null); // 이름 수정 중인 카테고리 ID

  // 거래출처 관리 상태
  const [newSourceName, setNewSourceName] = useState("");
  const [addingSource, setAddingSource] = useState(false);

  const familyId = family?.id ?? "";

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["categories", familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["members", familyId],
    queryFn: () => getMembers(familyId),
    enabled: !!familyId,
  });

  const { data: paymentSources = [], isLoading: paymentSourcesLoading } =
    useQuery({
      queryKey: ["paymentSources", familyId],
      queryFn: () => getPaymentSources(familyId),
      enabled: !!familyId,
    });

  const deleteCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", familyId] });
      // 카테고리를 지우면 연결된 거래·예산도 DB에서 함께 지워진다.
      // 다른 탭이 지워진 내역을 캐시에서 계속 보여주지 않도록 같이 무효화한다.
      for (const key of [
        "transactions",
        "summary",
        "transactionHistory",
        "savingsHistory",
        "budgets",
      ]) {
        qc.invalidateQueries({ queryKey: [key, familyId] });
      }
    },
  });

  // 삭제는 되돌릴 수 없고 연결된 내역까지 지우므로, 몇 건이 사라지는지 먼저 세어 보여준다.
  const [checkingDeleteId, setCheckingDeleteId] = useState<string | null>(null);
  async function confirmAndDeleteCategory(catId: string, name: string) {
    if (checkingDeleteId) return;
    setCheckingDeleteId(catId);
    try {
      const count = await countTransactionsByCategories(
        familyId,
        getCategoryIdsWithDescendants(categories, catId),
      );
      const message =
        count > 0
          ? `"${name}" 카테고리를 삭제하시겠습니까?\n\n이 카테고리로 등록된 내역 ${count.toLocaleString()}건이 함께 삭제되며, 되돌릴 수 없습니다.`
          : `"${name}" 카테고리를 삭제하시겠습니까?\n등록된 내역은 없습니다.`;
      if (confirm(message)) deleteCatMutation.mutate(catId);
    } catch {
      // 건수를 모르는 채로 지우게 두지 않는다.
      alert(
        "연결된 내역 수를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setCheckingDeleteId(null);
    }
  }

  const renameCatMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCategory(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", familyId] });
      setRenamingCatId(null);
    },
  });

  /** 같은 상위 분류 아래에 같은 이름이 이미 있는지 (자기 자신 제외) */
  function isDuplicateName(catId: string, name: string) {
    const target = categories.find((c) => c.id === catId);
    return categories.some(
      (c) =>
        c.id !== catId && c.parent_id === target?.parent_id && c.name === name,
    );
  }

  const addSubMutation = useMutation({
    mutationFn: ({ parentId, name }: { parentId: string; name: string }) => {
      const parentCat = categories.find((c) => c.id === parentId);
      return addCategory(
        familyId,
        name,
        parentCat?.icon ?? "label",
        parentCat?.color ?? "#BDC3C7",
        parentId,
        3,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", familyId] });
      setAddingSubOf(null);
      setNewSubName("");
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: (name: string) => addPaymentSource(familyId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentSources", familyId] });
      setNewSourceName("");
      setAddingSource(false);
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deletePaymentSource,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["paymentSources", familyId] }),
  });

  const [subInitResult, setSubInitResult] = useState<string | null>(null);
  const insertSubsMutation = useMutation({
    mutationFn: () => insertMissingSubCategories(familyId, categories),
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["categories", familyId] });
      setSubInitResult(
        count > 0
          ? `${count}개 소분류가 추가되었습니다.`
          : "이미 모두 추가되어 있습니다.",
      );
      setTimeout(() => setSubInitResult(null), 3000);
    },
  });

  const majorCategories = useMemo(
    () => getCategoriesByLevel(categories, 1),
    [categories],
  );

  const inviteMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: (invite) => {
      setInviteError("");
      setInviteUrl(
        `${window.location.origin}/join?token=${encodeURIComponent(invite.token)}`,
      );
    },
    onError: () => setInviteError("초대 링크 발급에 실패했습니다."),
  });

  const resetMutation = useMutation({
    mutationFn: resetFamilyData,
    onSuccess: () => {
      // 가계부 데이터를 전부 비웠으므로 캐시도 통째로 버린다.
      qc.clear();
      setResetting(false);
    },
    onError: () => setResetting(false),
  });

  function handleCopy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clear();
    qc.clear();
    router.replace("/welcome");
    router.refresh();
  }

  async function handleChangePassword() {
    if (!canChangePassword || changingPassword) return;
    setChangingPassword(true);
    setPasswordMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMessage({
        ok: false,
        // Supabase의 영어 메시지를 그대로 노출하지 않는다.
        text: error.message.includes("should be different")
          ? "기존 비밀번호와 다른 값을 입력하세요."
          : "비밀번호 변경에 실패했습니다.",
      });
    } else {
      setPasswordMessage({ ok: true, text: "비밀번호가 변경되었습니다." });
      setNewPassword("");
      setNewPasswordConfirm("");
    }
    setChangingPassword(false);
  }

  function handleReset() {
    if (
      !confirm(
        "가계부의 모든 거래·예산·자산·월별메모를 삭제합니다.\n카테고리와 거래출처는 남습니다.\n\n되돌릴 수 없습니다. 계속할까요?",
      )
    )
      return;
    setResetting(true);
    resetMutation.mutate();
  }

  // family·member가 아직 없는 구간도 로딩이다. 예전에는 null을 반환해 화면이
  // 통째로 비었는데, 이제 이 구간이 사용자에게 보이므로 스켈레톤을 띄운다.
  const isLoading =
    !family || !member || catLoading || membersLoading || paymentSourcesLoading;

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 프로필 */}
      <div className="flex items-center gap-4 px-5 py-6 bg-white border-b border-gray-100">
        <div className="w-14 h-14 rounded-full bg-teal-400 flex items-center justify-center text-white text-2xl font-bold">
          {member.nickname[0]}
        </div>
        <div>
          <p className="font-bold text-lg">{member.nickname}</p>
          <p className="text-xs text-gray-500">
            가족 구성원 {members.length}명
          </p>
        </div>
      </div>

      {/* 가족 정보 */}
      <div className="bg-white mt-2 px-5 py-4 border-b border-gray-100 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">
          가족 정보
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">가족 초대</span>
          <button
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            className="text-sm text-teal-500 hover:text-teal-600 disabled:opacity-40"
          >
            {inviteMutation.isPending ? "발급 중..." : "초대 링크 만들기"}
          </button>
        </div>

        {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}

        {inviteUrl && (
          <div className="rounded-xl bg-gray-50 p-3 space-y-2">
            <p className="text-[11px] text-gray-500">
              7일간 유효하며 한 번만 사용할 수 있습니다.
            </p>
            <p className="text-xs break-all text-gray-700">{inviteUrl}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-teal-500"
              >
                <Copy size={13} />
                링크 복사
              </button>
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-1 text-xs text-teal-500"
              >
                <QrCode size={13} />
                QR 보기
              </button>
            </div>
            {copied && (
              <p className="text-xs text-teal-500">링크가 복사되었습니다!</p>
            )}
          </div>
        )}

        <button
          onClick={() => setShowMembers(true)}
          className="flex items-center justify-between w-full"
        >
          <span className="text-sm text-gray-700">가족 구성원</span>
          <div className="flex items-center gap-1 text-gray-500">
            <Users size={16} />
            <span className="text-sm">{members.length}명</span>
          </div>
        </button>
      </div>

      {/* ─── 카테고리 관리 + 거래출처 관리 ─────────────────── */}
      <div className="md:grid md:grid-cols-2 md:gap-4">
        <div className="bg-white mt-2 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              카테고리 관리
            </p>
            <button
              onClick={() => insertSubsMutation.mutate()}
              disabled={insertSubsMutation.isPending}
              className="text-xs text-teal-500 hover:text-teal-600 disabled:opacity-40"
            >
              {insertSubsMutation.isPending ? "추가 중..." : "기본 소분류 추가"}
            </button>
          </div>
          {subInitResult && (
            <p className="text-xs text-teal-500 mb-2">{subInitResult}</p>
          )}
          <p className="text-xs text-gray-400 mb-3">
            중분류와 소분류는 연필 버튼으로 이름을 바꿀 수 있어요.
            <br />
            직접 추가한 항목은 삭제할 수 있고, 소분류는 새로 추가할 수 있어요.
          </p>

          <div className="space-y-1">
            {majorCategories.map((major) => {
              const middleList = getChildCategories(categories, major.id);
              const isOpenMajor = expandedMajor === major.id;

              return (
                <div
                  key={major.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  {/* 대분류 행 */}
                  <button
                    onClick={() =>
                      setExpandedMajor(isOpenMajor ? null : major.id)
                    }
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <CategoryIcon
                      icon={major.icon}
                      color={major.color}
                      size="sm"
                    />
                    <span className="flex-1 text-sm font-semibold text-left">
                      {major.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {middleList.length}개 중분류
                    </span>
                    {isOpenMajor ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                  </button>

                  {/* 중분류 목록 */}
                  {isOpenMajor && (
                    <div className="divide-y divide-gray-50">
                      {middleList.map((middle) => {
                        const subList = getChildCategories(
                          categories,
                          middle.id,
                        );
                        const isOpenMiddle = expandedMiddle === middle.id;

                        return (
                          <div key={middle.id}>
                            {/* 중분류 행 */}
                            {renamingCatId === middle.id ? (
                              <div className="px-4 py-2">
                                <CategoryNameEditor
                                  initialName={middle.name}
                                  isDuplicate={(name) =>
                                    isDuplicateName(middle.id, name)
                                  }
                                  isPending={renameCatMutation.isPending}
                                  onSave={(name) =>
                                    renameCatMutation.mutate({
                                      id: middle.id,
                                      name,
                                    })
                                  }
                                  onCancel={() => setRenamingCatId(null)}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                                <button
                                  onClick={() =>
                                    setExpandedMiddle(
                                      isOpenMiddle ? null : middle.id,
                                    )
                                  }
                                  className="flex items-center gap-2 flex-1 min-w-0"
                                >
                                  <CategoryIcon
                                    icon={middle.icon}
                                    color={middle.color}
                                    size="sm"
                                  />
                                  <span className="flex-1 text-sm text-left">
                                    {middle.name}
                                  </span>
                                  {middle.is_default && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                      기본
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {subList.length}개
                                  </span>
                                  {isOpenMiddle ? (
                                    <ChevronDown
                                      size={13}
                                      className="text-gray-400"
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={13}
                                      className="text-gray-400"
                                    />
                                  )}
                                </button>
                                <button
                                  onClick={() => setRenamingCatId(middle.id)}
                                  aria-label={`${middle.name} 이름 수정`}
                                  className="text-gray-300 hover:text-teal-500 shrink-0"
                                >
                                  <Pencil size={13} />
                                </button>
                                {!middle.is_default && (
                                  <button
                                    onClick={() =>
                                      confirmAndDeleteCategory(
                                        middle.id,
                                        middle.name,
                                      )
                                    }
                                    disabled={checkingDeleteId !== null}
                                    aria-label={`${middle.name} 삭제`}
                                    className="text-gray-300 hover:text-red-400 shrink-0 disabled:opacity-40"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* 소분류 목록 */}
                            {isOpenMiddle && (
                              <div className="px-4 pb-2 space-y-1">
                                {subList.map((sub) =>
                                  renamingCatId === sub.id ? (
                                    <div key={sub.id} className="pl-2 py-1">
                                      <CategoryNameEditor
                                        initialName={sub.name}
                                        isDuplicate={(name) =>
                                          isDuplicateName(sub.id, name)
                                        }
                                        isPending={renameCatMutation.isPending}
                                        onSave={(name) =>
                                          renameCatMutation.mutate({
                                            id: sub.id,
                                            name,
                                          })
                                        }
                                        onCancel={() => setRenamingCatId(null)}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      key={sub.id}
                                      className="flex items-center gap-2 pl-2 py-1"
                                    >
                                      <span className="flex-1 text-xs text-gray-600">
                                        {sub.name}
                                      </span>
                                      <button
                                        onClick={() => setRenamingCatId(sub.id)}
                                        aria-label={`${sub.name} 이름 수정`}
                                        className="text-gray-300 hover:text-teal-500"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      {sub.is_default ? (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                          기본
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            confirmAndDeleteCategory(
                                              sub.id,
                                              sub.name,
                                            )
                                          }
                                          disabled={checkingDeleteId !== null}
                                          aria-label={`${sub.name} 삭제`}
                                          className="text-gray-300 hover:text-red-400 disabled:opacity-40"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ),
                                )}

                                {/* 소분류 추가 */}
                                {addingSubOf === middle.id ? (
                                  <div className="flex items-center gap-2 pl-2 pt-1">
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="소분류 이름"
                                      value={newSubName}
                                      onChange={(e) =>
                                        setNewSubName(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" &&
                                          newSubName.trim()
                                        ) {
                                          addSubMutation.mutate({
                                            parentId: middle.id,
                                            name: newSubName.trim(),
                                          });
                                        }
                                        if (e.key === "Escape") {
                                          setAddingSubOf(null);
                                          setNewSubName("");
                                        }
                                      }}
                                      className="flex-1 text-xs border border-teal-300 rounded-lg px-2 py-1 outline-none"
                                    />
                                    <button
                                      disabled={
                                        !newSubName.trim() ||
                                        addSubMutation.isPending
                                      }
                                      onClick={() =>
                                        addSubMutation.mutate({
                                          parentId: middle.id,
                                          name: newSubName.trim(),
                                        })
                                      }
                                      className="text-xs text-teal-500 font-medium disabled:opacity-40"
                                    >
                                      추가
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAddingSubOf(null);
                                        setNewSubName("");
                                      }}
                                      className="text-xs text-gray-400"
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setAddingSubOf(middle.id);
                                      setExpandedMiddle(middle.id);
                                    }}
                                    className="flex items-center gap-1 pl-2 py-1 text-xs text-teal-500 hover:text-teal-600"
                                  >
                                    <Plus size={12} />
                                    소분류 추가
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 거래출처 관리 ─────────────────────────────── */}
        <div className="bg-white mt-2 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              거래출처 관리
            </p>
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
                <span className="material-symbols-outlined text-base text-gray-400">
                  credit_card
                </span>
                <span className="flex-1 text-sm">{ps.name}</span>
                {ps.is_default ? (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    기본
                  </span>
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
                    if (e.key === "Enter" && newSourceName.trim()) {
                      addSourceMutation.mutate(newSourceName.trim());
                    }
                    if (e.key === "Escape") {
                      setAddingSource(false);
                      setNewSourceName("");
                    }
                  }}
                  className="flex-1 text-sm border border-teal-300 rounded-xl px-3 py-1.5 outline-none"
                />
                <button
                  disabled={
                    !newSourceName.trim() || addSourceMutation.isPending
                  }
                  onClick={() => addSourceMutation.mutate(newSourceName.trim())}
                  className="text-sm text-teal-500 font-medium disabled:opacity-40"
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setAddingSource(false);
                    setNewSourceName("");
                  }}
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
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white mt-2 px-5 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">
          비밀번호 변경
        </p>
        <input
          type="password"
          placeholder="새 비밀번호 (6자 이상)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-400"
        />
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          value={newPasswordConfirm}
          onChange={(e) => setNewPasswordConfirm(e.target.value)}
          autoComplete="new-password"
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none ${
            passwordMismatch
              ? "border-red-400 focus:border-red-400"
              : "focus:border-teal-400"
          }`}
        />
        {passwordMismatch && (
          <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
        )}
        {passwordMessage && (
          <p
            className={`text-xs ${
              passwordMessage.ok ? "text-teal-500" : "text-red-500"
            }`}
          >
            {passwordMessage.text}
          </p>
        )}
        <button
          onClick={handleChangePassword}
          disabled={!canChangePassword || changingPassword}
          className="w-full py-2.5 rounded-xl bg-teal-400 text-white text-sm font-bold disabled:opacity-40"
        >
          {changingPassword ? "변경 중..." : "비밀번호 변경"}
        </button>
      </div>

      {/* 데이터 초기화 / 로그아웃 */}
      <div className="bg-white mt-2 px-5 py-4 mb-4 space-y-4">
        <div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 text-red-500 text-sm disabled:opacity-40"
          >
            <Trash2 size={16} />
            {resetting ? "삭제 중..." : "데이터 초기화"}
          </button>
          <p className="text-xs text-gray-400 mt-1">
            거래·예산·자산·월별메모를 모두 삭제합니다. 샘플로 둘러본 뒤 처음부터
            시작할 때 사용하세요.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-gray-600 text-sm"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>

      {/* QR 모달 */}
      {showQR && inviteUrl && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowQR(false)}
        >
          <div className="bg-white rounded-2xl p-8 space-y-4 flex flex-col items-center">
            <p className="font-bold">초대 링크 QR</p>
            <QRCode value={inviteUrl} size={200} />
            <p className="text-xs text-gray-500">탭하여 닫기</p>
          </div>
        </div>,
        document.body,
      )}

      {/* 멤버 목록 모달 */}
      {showMembers && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-72 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold">가족 구성원</p>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm">
                  {m.nickname[0]}
                </div>
                <span className="text-sm">{m.nickname}</span>
                {m.id === member.id && (
                  <span className="text-[10px] bg-teal-50 text-teal-500 px-2 py-0.5 rounded-full ml-auto">
                    나
                  </span>
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
        </div>,
        document.body,
      )}
    </div>
  );
}

/** 카테고리 이름 인라인 수정 입력. Enter로 저장, Escape로 취소. */
function CategoryNameEditor({
  initialName,
  isDuplicate,
  isPending,
  onSave,
  onCancel,
}: {
  initialName: string;
  isDuplicate: (name: string) => boolean;
  isPending: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  const duplicate = isDuplicate(trimmed);
  const canSave = !!trimmed && !duplicate && !isPending;

  function submit() {
    if (!canSave) return;
    // 바뀐 게 없으면 요청 없이 닫는다.
    if (trimmed === initialName) onCancel();
    else onSave(trimmed);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          className="flex-1 min-w-0 text-xs border border-teal-300 rounded-lg px-2 py-1 outline-none"
        />
        <button
          disabled={!canSave}
          onClick={submit}
          className="text-xs text-teal-500 font-medium disabled:opacity-40"
        >
          저장
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400">
          취소
        </button>
      </div>
      {duplicate && (
        <p className="mt-1 text-[10px] text-red-400">
          같은 분류 안에 이미 있는 이름입니다.
        </p>
      )}
    </div>
  );
}
