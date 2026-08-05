"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

/**
 * 로그인은 했지만 아직 가족이 없는 상태에서 보이는 화면.
 *
 * 참여 버튼이 없는 이유: 가족 참여는 초대 링크(/join?token=...) 전용이다.
 * 토큰이 길어 손으로 입력할 수 없으므로 여기서 들어갈 경로가 없다.
 */
export default function FamilySetupPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/welcome");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
          <Users size={48} className="text-teal-400" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">가족 설정</h1>
          <p className="text-gray-600 text-sm">
            새 가계부를 만들거나, 초대 링크로 참여하세요
          </p>
        </div>

        <div className="w-full space-y-3">
          <Link
            href="/create-family"
            className="block w-full py-3.5 rounded-2xl bg-teal-400 text-white text-center font-bold text-base"
          >
            새 가계부 만들기
          </Link>

          <div className="rounded-2xl bg-gray-50 px-4 py-3.5 text-center">
            <p className="text-sm text-gray-600">
              초대를 받으셨나요?
              <br />
              전달받은 <span className="font-semibold">초대 링크</span>로
              접속하면 바로 참여할 수 있습니다.
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 underline"
        >
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
