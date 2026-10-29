import { getCourses } from "@/actions/courses";
import { CreateCourseForm } from "@/components/courses/create-course-form";

export default async function CoursesPage() {
  const courses: any[] = [];

  return (
    <div className="max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="mt-2 text-foreground/60">
          Create and manage your courses.
        </p>
      </div>

      <div className="mt-8">
        <CreateCourseForm />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground/80">Your courses</h2>
        {courses.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/60">
            No courses yet. Create your first course above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
            {courses.map((course) => (
              <li key={course.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{course.name}</p>
                    {course.subjectCode && (
                      <p className="mt-1 text-sm text-foreground/60">
                        {course.subjectCode}
                      </p>
                    )}
                  </div>
                  <time
                    dateTime={course.createdAt}
                    className="shrink-0 text-xs text-foreground/50"
                  >
                    {new Date(course.createdAt).toLocaleDateString()}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
