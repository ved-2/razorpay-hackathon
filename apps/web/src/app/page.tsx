import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function Home() {
  return (
    <DashboardShell>
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your commerce performance.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="mt-2 text-2xl font-semibold">₹0</p>
          </div>

          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="mt-2 text-2xl font-semibold">0</p>
          </div>

          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">
              Opportunities
            </p>
            <p className="mt-2 text-2xl font-semibold">0</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}