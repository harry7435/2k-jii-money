import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()

  const correct = process.env.APP_PASSWORD
  if (!correct) {
    return NextResponse.json({ error: '서버 설정 오류 (APP_PASSWORD 미설정)' }, { status: 500 })
  }

  if (password !== correct) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
