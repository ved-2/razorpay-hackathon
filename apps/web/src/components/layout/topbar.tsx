export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>
        <p className="text-sm text-muted-foreground">Merchant Dashboard</p>
      </div>

      <div className="text-sm font-medium">
        Demo Store
      </div>
    </header>
  );
}