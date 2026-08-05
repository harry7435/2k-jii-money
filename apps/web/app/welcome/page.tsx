"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

type Mode = "login" | "signup";

/** 로그인 후 돌아갈 경로. 같은 출처의 절대 경로만 허용한다 (오픈 리다이렉트 방지). */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

function WelcomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 확인란은 회원가입에만 있다. 로그인 때는 비어 있으므로 검사에서 빼야 한다.
  const passwordMismatch =
    mode === "signup" &&
    passwordConfirm.length > 0 &&
    password !== passwordConfirm;
  const canSubmit =
    Boolean(email) &&
    password.length >= 6 &&
    (mode === "login" || (passwordConfirm.length > 0 && !passwordMismatch));

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();

    if (mode === "signup" && password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(messageFor(authError.message, mode));
      setLoading(false);
      return;
    }

    // middleware가 가족 소속 여부를 보고 /home 또는 /family-setup으로 보낸다.
    router.replace(next ?? "/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
          <Wallet size={48} className="text-teal-400" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">우리집 가계부</h1>
          <p className="text-gray-600 text-sm">
            부부가 함께 관리하는 스마트 가계부
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400 placeholder:text-gray-500"
            autoFocus
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            className="w-full border rounded-xl px-4 py-3 outline-none focus:border-teal-400 placeholder:text-gray-500"
          />
          {mode === "signup" && (
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              className={`w-full border rounded-xl px-4 py-3 outline-none placeholder:text-gray-500 ${
                passwordMismatch
                  ? "border-red-400 focus:border-red-400"
                  : "focus:border-teal-400"
              }`}
            />
          )}
          {passwordMismatch && (
            <p className="text-red-500 text-sm text-center">
              비밀번호가 일치하지 않습니다.
            </p>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="block w-full py-3.5 rounded-2xl bg-teal-400 text-white text-center font-bold text-base disabled:opacity-40"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setPasswordConfirm("");
            setError("");
          }}
          className="text-sm text-gray-600 underline"
        >
          {mode === "login"
            ? "계정이 없으신가요? 회원가입"
            : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </div>
  );
}

/** Supabase가 돌려주는 영어 메시지를 그대로 노출하지 않는다. */
function messageFor(raw: string, mode: Mode): string {
  if (raw.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (raw.includes("already registered") || raw.includes("already been")) {
    return "이미 가입된 이메일입니다.";
  }
  if (raw.includes("Password")) {
    return "비밀번호는 6자 이상이어야 합니다.";
  }
  return mode === "login"
    ? "로그인에 실패했습니다."
    : "회원가입에 실패했습니다.";
}

export default function WelcomePage() {
  // useSearchParams는 Suspense 경계가 필요하다.
  return (
    <Suspense fallback={null}>
      <WelcomeForm />
    </Suspense>
  );
}
