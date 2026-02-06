// app/api/test/route.ts (Next.js)
export async function GET() {
  // Use internal Docker URL if available, otherwise fallback to public/localhost
  const baseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/echo`);
  const data = await res.json();
  return Response.json(data);
}

export async function POST (req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/stream`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({error: "Backend error, please try again later."}),
        {status: 502}
      )
    }
    return res;
  } catch (err) {
    return new Response(
      JSON.stringify({ err: "Chat service is temporarily unavailable."}),
      {status: 503}
    )
  }
}