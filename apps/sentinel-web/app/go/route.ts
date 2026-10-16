import { NextResponse } from "next/server";

/** Entry from onenexora.com. Real build: check Clerk session, send signed-out users to account.onenexora.com. */
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/app", req.url));
}
