// app/robots.txt/route.ts
export async function GET() {
  return new Response(
    [
      "User-agent: *",
      "Allow: /",                       // もし全部クロールOKなら
      "Sitemap: https://culture.gakuten.co.jp/sitemap.xml",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain" } },
  );
}