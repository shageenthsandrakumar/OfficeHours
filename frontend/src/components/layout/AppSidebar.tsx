"use client";

import type { TablerIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/Badge";

export interface NavItem {
  id: string;
  label: string;
  icon: TablerIcon;
}

interface Props {
  active: string;
  items: NavItem[];
  onSelect: (id: string) => void;
  userName: string;
  userInitials: string;
  onSignOut: () => void;
}

export function AppSidebar({
  active,
  items,
  onSelect,
  userName,
  userInitials,
  onSignOut,
}: Props) {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-[220px] flex-col border-r border-ascend-border/80 bg-ascend-sidebar px-4 py-6">
      <p className="font-heading text-[18px] text-ascend-text">Ascend</p>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-md px-4 py-2.5 text-left text-sm transition",
                isActive
                  ? "bg-ascend-border font-medium text-ascend-text"
                  : "font-normal text-ascend-muted hover:bg-ascend-border/50 hover:text-ascend-text"
              )}
            >
              <Icon size={18} stroke={1.5} className="shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-ascend-border/80 pt-4">
        <div className="flex items-center gap-3 px-2">
          <AvatarInitials initials={userInitials} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ascend-text">{userName}</p>
            <button
              type="button"
              onClick={onSignOut}
              className="label-text hover:text-ascend-primary"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppMain({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ascend-bg pl-[220px]">
      <main className="mx-auto max-w-content px-8 py-8">{children}</main>
    </div>
  );
}

export function MobileNav({
  active,
  items,
  onSelect,
}: Pick<Props, "active" | "items" | "onSelect">) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            "rounded-md px-3 py-2 text-xs",
            active === item.id
              ? "bg-ascend-border font-medium text-ascend-text"
              : "bg-ascend-card text-ascend-muted"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
