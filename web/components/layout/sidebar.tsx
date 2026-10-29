import { getCourses } from "@/actions/courses";
import { AddCourseButton } from "@/components/courses/add-course-button";
import { CourseSidebarItem } from "@/components/courses/course-sidebar-item";

export async function Sidebar() {
  let courses: Awaited<ReturnType<typeof getCourses>> = [];
  let loadError = false;

  try {
    courses = await getCourses();
  } catch {
    loadError = true;
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-foreground/10 print:hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="px-1 text-2xl font-semibold text-foreground">
          Courses
        </h2>
        {loadError ? (
          <p className="mt-3 px-1 text-sm text-red-600">
            Couldn&apos;t load courses.
          </p>
        ) : courses.length === 0 ? (
          <p className="mt-3 px-1 text-sm text-foreground/60">
            No courses yet. Add your first one below.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {courses.map((course) => (
              <li key={course.id}>
                <CourseSidebarItem course={course} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sticky bottom-0 border-t border-foreground/10 bg-background p-4">
        <AddCourseButton />
      </div>
    </aside>
  );
}
