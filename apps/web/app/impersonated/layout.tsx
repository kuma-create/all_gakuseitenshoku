import ImpersonationBanner from "@/components/ImpersonationBanner";

export default function ImpersonatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ImpersonationBanner />
      {/* children に既存のユーザー UI ルートをラップ */}
      {children}
    </>
  );
}