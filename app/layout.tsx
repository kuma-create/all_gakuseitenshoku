import { usePathname } from "next/navigation";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function AuthGuard() {
  // ---------------- パブリックルートはスキップ ----------------
  // ここに列挙したパスはゲスト閲覧を許可し、useAuthGuard を実行しない
  const pathname = usePathname();
  const publicRoutes = ["/", "/login", "/signup", "/auth/student/register"];

  if (publicRoutes.includes(pathname)) {
    return null; // ガードを無効化
  }

  useAuthGuard();

  return null;
}
