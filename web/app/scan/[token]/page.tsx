type ScanPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ScanPage({ params }: ScanPageProps) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold">Mark Attendance</h1>
      <p className="mt-2 max-w-md text-foreground/60">
        Student landing page for token <code className="text-sm">{token}</code>.
        Attendees scan the QR and confirm check-in here.
      </p>
    </main>
  );
}
