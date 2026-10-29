import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureTeacherProfile(
  supabase: SupabaseClient,
  user: User,
  name?: string,
) {
  const displayName =
    name?.trim() ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : undefined) ||
    user.email?.split("@")[0] ||
    "Teacher";

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email!,
      name: displayName,
      role: "teacher",
    },
    { onConflict: "id" },
  );

  return error;
}
