import { NextResponse } from "next/server"

const TARGETS: Readonly<Record<string, string>> = Object.freeze({
  dev: "https://dev-app.beonedge.in/dashboard",
  app: "https://app.beonedge.in/dashboard",
})

export const dynamic = "force-dynamic"

export const GET = (
  request: Request,
  context: { params: { target: string } },
): NextResponse => {
  const destination = TARGETS[context.params.target]
  if (destination === undefined) {
    return new NextResponse("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } })
  }

  const incoming = new URL(request.url).searchParams
  const target = new URL(destination)
  for (const [key, value] of incoming) target.searchParams.set(key, value)

  return NextResponse.redirect(target.toString(), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  })
}
