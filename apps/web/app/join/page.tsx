"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Link2Off, Users } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import {
  getCurrentMembership,
  joinFamilyByInvite,
} from "@/src/lib/supabase/queries";

type State =
  | { kind: "loading" }
  | { kind: "needs-login" }
  | { kind: "already-member" }
  | { kind: "no-token" }
  | { kind: "ready" };

/** Postgres 예외 메시지를 사용자에게 보여줄 문구로 옮긴다. */
function joinErrorMessage(raw: string): string {
  if (raw.includes("invalid invite")) return "유효하지 않은 초대 링크입니다.";
  if (raw.includes("invite expired")) return "만료된 초대 링크입니다.";
  if (raw.includes("already used"))
    return "이미 사용된 초대 링크입니다. 새 링크를 요청하세요.";
  if (raw.includes("already belongs")) return "이미 가족에 속해 있습니다.";
  return "참여에 실패했습니다.";
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>({ kind: "loading" });
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!token) {
        if (!cancelled) setState({ kind: "no-token" });
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (!user) {
        setState({ kind: "needs-login" });
        return;
      }

      const membership = await getCurrentMembership();
      if (cancelled) return;
      setState(membership ? { kind: "already-member" } : { kind: "ready" });
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleJoin() {
    if (!token || !nickname.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      await joinFamilyByInvite(token, nickname.trim());
      router.replace("/home/transactions");
      router.refresh();
    } catch (e) {
      setError(joinErrorMessage(e instanceof Error ? e.message : ""));
      setLoading(false);
    }
  }

  if (state.kind === "loading") return null;

  if (state.kind === "no-token") {
    return (
      <Shell icon={<Link2Off size={48} className="text-gray-400" />}>
        <h1 className="text-xl font-bold text-gray-900">
          초대 링크가 올바르지 않습니다
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          전달받은 링크를 다시 확인해 주세요.
        </p>
      </Shell>
    );
  }

  if (state.kind === "needs-login") {
    // 초대 맥락을 유지한 채 로그인으로 보낸다.
    const next = `/join?token=${encodeURIComponent(token ?? "")}`;
    return (
      <Shell icon={<Users size={48} className="text-teal-400" />}>
        <h1 className="text-xl font-bold text-gray-900">가족 초대</h1>
        <p className="text-gray-600 text-sm mt-1">
          로그인하면 가계부에 참여할 수 있습니다.
        </p>
        <Link
          href={`/welcome?next=${encodeURIComponent(next)}`}
          className="mt-6 block w-full py-3.5 rounded-2xl bg-teal-400 text-white text-center font-bold"
        >
          로그인 / 회원가입
        </Link>
      </Shell>
    );
  }

  if (state.kind === "already-member") {
    return (
      <Shell icon={<CheckCircle size={48} className="text-teal-400" />}>
        <h1 className="text-xl font-bold text-gray-900">
          이미 가족에 속해 있습니다
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          한 계정은 하나의 가계부에만 참여할 수 있습니다.
        </p>
        <Link
          href="/home/transactions"
          className="mt-6 block w-full py-3.5 rounded-2xl bg-teal-400 text-white text-center font-bold"
        >
          내 가계부로 이동
        </Link>
      </Shell>
    );
  }

  return (
    <Shell icon={<Users size={48} className="text-teal-400" />}>
      <h1 className="text-xl font-bold text-gray-900">가족 초대</h1>
      <p className="text-gray-600 text-sm mt-1">닉네임을 입력하고 참여하세요</p>
      <div className="mt-6 space-y-3 text-left">
        <input
          type="text"
          placeholder="사용할 닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400"
          autoFocus
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={!nickname.trim() || loading}
          className="w-full py-3.5 rounded-2xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {loading ? "참여 중..." : "참여하기"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center mb-8">
          {icon}
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  );
}
