"use client";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" className="px-2 py-1 text-sm">
        Sign out
      </Button>
    </form>
  );
}
