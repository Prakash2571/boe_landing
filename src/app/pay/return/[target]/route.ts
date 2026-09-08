import { NextResponse } from "next/server"

// PhonePe returns the payer to the approved merchant origin (www.beonedge.in), never
// straight to an app host. This hands them on to the application's own return page.
//
// The mapping is a fixed allowlist rather than anything derived from the request: a
// target key selects one of these two entries or gets a 404. No query parameter, path
// segment or header can introduce a destination, so this cannot become an open redirect.
//
// `app` is the established public name for the production target. It is deliberately not
// renamed to `prod` — the URL is configured on the PhonePe merchant dashboard and in the
// server environment, so the public route name has to stay stable.
const TARGETS: Readonly<Record<string, string>> = Object.freeze({
  dev: "https://dev-app.beonedge.in/pay/return",
  app: "https://app.beonedge.in/pay/return",
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

  // The whole search string is carried over verbatim rather than copied key by key, so
  // repeated keys and parameter order survive exactly as the provider sent them. The
  // application treats these as navigation context only; payment state stays
  // backend-owned.
  const target = new URL(destination)
  target.search = new URL(request.url).search

  return NextResponse.redirect(target.toString(), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  })
}
