import { notFound } from "next/navigation";
import { getCourse } from "@/actions/courses";
import { QrDisplay } from "@/components/session/qr-display";
import { PrintButton } from "@/components/courses/print-button";

type FixedQrPageProps = {
  params: Promise<{ id: string }>;
};

/// Standalone route deliberately outside the dashboard/course layouts —
/// this is a printable page and should show nothing but the QR code and
/// course name, not the app's nav, sidebar, or course tabs.
export default async function FixedQrPage({ params }: FixedQrPageProps) {
  const { id } = await params;

  const course = await getCourse(id);
  if (!course || !course.fixedCheckinEnabled) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">{course.name}</h1>
      <QrDisplay token={null} path={`/scan/fixed/${id}`} />
      <div className="print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}
