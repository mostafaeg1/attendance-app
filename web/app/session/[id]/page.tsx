import { notFound } from "next/navigation";
import { getSessionById, getCheckInCount } from "@/actions/sessions";
import { SessionLiveView } from "@/components/session/session-live-view";

type SessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;

  let session;
  try {
    session = await getSessionById(id);
  } catch {
    notFound();
  }

  if (!session) {
    notFound();
  }

  const initialCheckInCount = await getCheckInCount(session.id);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <SessionLiveView session={session} initialCheckInCount={initialCheckInCount} />
    </main>
  );
}
