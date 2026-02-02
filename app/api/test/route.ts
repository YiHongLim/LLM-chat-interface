// app/api/test/route.ts (Next.js)
export async function GET() {
  // Use internal Docker URL if available, otherwise fallback to public/localhost
  const baseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/echo`);
  const data = await res.json();
  return Response.json(data);
}
