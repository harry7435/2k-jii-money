"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createFamily, seedSampleData } from "@/src/lib/supabase/queries";
import { SAMPLE_MONTHS } from "@/src/lib/utils/sampleData";

export default function CreateFamilyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [withSample, setWithSample] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!nickname.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const { family, member } = await createFamily(nickname.trim());
      if (withSample) await seedSampleData(family.id, member.id);

      router.replace("/home/transactions");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("already belongs")
          ? "이미 가족에 속해 있습니다."
          : "가족 생성에 실패했습니다.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-3 font-bold text-lg">새 가계부 만들기</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-gray-600">닉네임</label>
          <input
            type="text"
            placeholder="사용할 닉네임을 입력하세요"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400"
            autoFocus
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={withSample}
            onChange={(e) => setWithSample(e.target.checked)}
            className="mt-0.5 size-4 accent-teal-400"
          />
          <span className="text-sm">
            <span className="font-semibold text-gray-900">
              샘플 데이터로 시작하기
            </span>
            <span className="block text-gray-600 mt-0.5">
              최근 {SAMPLE_MONTHS}개월치 가상 거래·예산·자산이 들어갑니다.
              설정에서 언제든 초기화할 수 있습니다.
            </span>
          </span>
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!nickname.trim() || loading}
          className="w-full py-3.5 rounded-2xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {loading ? "생성 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
