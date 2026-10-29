import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-foreground/10 p-8">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Teacher account — powered by Supabase Auth
        </p>
        {error === "auth_callback_failed" && (
          <p className="mt-4 text-sm text-red-600">
            Email confirmation failed. Please try signing in again.
          </p>
        )}
        <LoginForm redirectTo={redirect} />
      </div>
    </main>
  );
}
