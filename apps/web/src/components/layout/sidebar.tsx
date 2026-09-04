import Link from "next/link";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Products", href: "/products" },
  { name: "Orders", href: "/orders" },
  { name: "Revenue", href: "/revenue" },
  { name: "Approvals", href: "/approvals" },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-semibold">CommerceOS</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/settings"
          className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}