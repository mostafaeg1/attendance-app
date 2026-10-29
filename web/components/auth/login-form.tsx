"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: AuthState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {redirectTo && (
        <input type="hidden" name="redirect" value={redirectTo} />
      )}
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-foreground/20 px-3 py-2"
          placeholder="you@example.com"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-foreground/20 px-3 py-2"
        />
      </label>
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-foreground/60">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
