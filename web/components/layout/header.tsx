import Link from "next/link";
import { AuthNav } from "@/components/layout/auth-nav";

export function Header() {
  return (
    <header className="border-b border-foreground/10 px-6 py-4 print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Attendance
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/billing" className="hover:underline">
            Billing
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
