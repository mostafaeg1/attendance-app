"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/dashboard/courses/${courseId}/sessions`, label: "Sessions" },
    { href: `/dashboard/courses/${courseId}/attendees`, label: "Attendees" },
  ];

  return (
    <nav className="mt-6 flex gap-1 border-b border-foreground/10">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
