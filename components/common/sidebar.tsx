"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "./connect-btn";
import { LayoutDashboard, FolderKanban, ScrollText } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight flex items-center gap-0"
        >
          <span className="text-purple-600">X</span>
          <span className="text-gray-900">pack</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                  : "text-gray-600 hover:bg-purple-50/70 hover:text-gray-900"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <ConnectButton />
      </div>
    </aside>
  );
}
