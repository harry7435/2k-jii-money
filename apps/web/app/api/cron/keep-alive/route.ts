import { createClient } from "@/src/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Supabase 무료 플랜의 프로젝트 일시정지를 막기 위한 일일 핑 (vercel.json의 crons).
 *
 * 예전에는 families 테이블을 조회했지만, anon 권한을 전부 회수한 뒤로는 불가능하다.
 * 데이터를 건드리지 않는 ping() 함수로 DB 활동만 남긴다.
 */
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ping");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
