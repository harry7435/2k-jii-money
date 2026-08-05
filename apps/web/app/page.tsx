import { redirect } from "next/navigation";

/**
 * 실제 분기는 middleware가 처리한다 (로그인 여부 + 가족 소속 여부).
 * 여기까지 왔다면 미로그인 상태이므로 로그인 화면으로 보낸다.
 */
export default function RootPage() {
  redirect("/welcome");
}
