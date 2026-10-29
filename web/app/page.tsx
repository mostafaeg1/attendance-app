import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
          QR Attendance for Teachers
        </h1>
        <p className="mt-4 max-w-xl text-lg text-foreground/60">
          Generate session QR codes, track attendance in real time, and export
          reports — no more paper sign-in sheets.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/signup">
            <Button>Get started</Button>
          </Link>
          <Link href="/billing">
            <Button variant="secondary">View plans</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
