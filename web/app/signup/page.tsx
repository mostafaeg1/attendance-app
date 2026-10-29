import { SignUpForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-foreground/10 p-8">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Start on the Free plan — powered by Supabase Auth
        </p>
        <SignUpForm />
      </div>
    </main>
  );
}
