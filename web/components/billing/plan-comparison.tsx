import { PLAN_FEATURES } from "@/constants/plans";

export function PlanComparison() {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/5">
            <th className="px-4 py-3 font-medium">Feature</th>
            <th className="px-4 py-3 font-medium">Free</th>
            <th className="px-4 py-3 font-medium">Pro</th>
          </tr>
        </thead>
        <tbody>
          {PLAN_FEATURES.map((feature) => (
            <tr key={feature.label} className="border-b border-foreground/10 last:border-0">
              <td className="px-4 py-3">{feature.label}</td>
              <td className="px-4 py-3">
                {typeof feature.free === "boolean"
                  ? feature.free
                    ? "✓"
                    : "—"
                  : feature.free}
              </td>
              <td className="px-4 py-3">
                {typeof feature.pro === "boolean"
                  ? feature.pro
                    ? "✓"
                    : "—"
                  : feature.pro}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
