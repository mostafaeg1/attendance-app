"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: AuthState = {};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Full name
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          className="rounded-lg border border-foreground/20 px-3 py-2"
          placeholder="Jane Doe"
        />
      </label>
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
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-foreground/20 px-3 py-2"
          placeholder="At least 8 characters"
        />
      </label>
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.message && (
        <p className="text-sm text-green-700">{state.message}</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-foreground/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
