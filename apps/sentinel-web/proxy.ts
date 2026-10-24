import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// Authorisation is checked where data is read (requireCtx), not by path matching here.
// The middleware only makes the Clerk session available to server code.
const clerk = clerkMiddleware();

/** Without Clerk keys (local dev) requests pass through and the demo user is used. */
export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next();
  return clerk(req, ev);
}

export const config = { matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"] };
