import { Header } from "@/components/layout/header";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { Button } from "@/components/ui/button";

export default function BillingPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-semibold">Plans & Billing</h1>
        <p className="mt-2 text-foreground/60">
          Compare plans and upgrade to Pro via Stripe Checkout.
        </p>
        <div className="mt-8">
          <PlanComparison />
        </div>
        <div className="mt-8">
          <Button>Upgrade to Pro</Button>
        </div>
      </main>
    </>
  );
}
