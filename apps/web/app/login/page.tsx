/* app/login/page.tsx
   - metadata / viewport をここで宣言
   - ロジックはクライアント側へ委譲
*/
import LoginClient from "./LoginClient";

export const metadata = { title: "ログイン" };

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function Page() {
  return <LoginClient />;
}
