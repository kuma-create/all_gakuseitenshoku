/* ------------------------------------------------------------------
   app/admin/layout.tsx  –  ガードは置かず UI ラップのみ
------------------------------------------------------------------ */
export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <>{children}</>;
  }