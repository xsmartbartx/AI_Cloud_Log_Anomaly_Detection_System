import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "Lineworth",
  openGraph: { title: "Lineworth", siteName: "Lineworth", type: "website" },
  twitter: { card: "summary_large_image" },
  description: "Paste a log sample and get the ten lines worth reading, with a reason for each. Flat price per scan, no overage bills.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
  // Without Clerk keys (local dev) the provider is skipped and the demo user is used.
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{body}</ClerkProvider> : body;
}
