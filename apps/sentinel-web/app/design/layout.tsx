import { notFound } from "next/navigation";

/** The design-system showcase is a development tool; it does not exist in production. */
export default function DesignLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
