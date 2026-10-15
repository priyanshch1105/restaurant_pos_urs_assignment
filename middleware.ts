import { NextRequest, NextResponse } from "next/server";

/**
 * Keep the Vercel-hosted UI on one origin while forwarding API and Swagger
 * requests to the Express service. Leave unset for the local combined server.
 */
export function middleware(request: NextRequest) {
  const backendOrigin = process.env.BACKEND_ORIGIN?.trim().replace(/\/+$/, "");
  if (!backendOrigin) return NextResponse.next();

  const target = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    backendOrigin,
  );
  return NextResponse.rewrite(target);
}

export const config = {
  matcher: ["/api/:path*", "/api-docs/:path*"],
};
