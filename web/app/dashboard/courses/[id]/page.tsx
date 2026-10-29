import { redirect } from "next/navigation";

type CourseIndexPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseIndexPage({ params }: CourseIndexPageProps) {
  const { id } = await params;
  redirect(`/dashboard/courses/${id}/sessions`);
}
