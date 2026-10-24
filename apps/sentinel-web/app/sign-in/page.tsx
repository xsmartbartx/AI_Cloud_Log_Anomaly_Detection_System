import Link from "next/link";
import { redirect } from "next/navigation";

/** With Clerk configured, sign-in lives on the shared NEXORA account domain. */
export default function SignIn() {
  const hosted = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
  if (hosted) redirect(`${hosted}?redirect_url=${encodeURIComponent(`${process.env.APP_URL ?? ""}/app`)}`);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl">Sign in with NEXORA</h1>
      <p className="text-sm text-muted">Sign-in is not configured in this environment. Local development continues as a demo user.</p>
      <Link href="/app" className="inline-flex h-10 items-center justify-center rounded-md bg-accent text-sm font-semibold text-on-accent hover:bg-accent-hover">Continue as demo user</Link>
    </main>
  );
}
