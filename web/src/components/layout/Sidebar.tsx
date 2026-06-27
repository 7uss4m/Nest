"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";
import { clearAuth, getUserDisplayName, getUserEmail, getUserId, getWorkspaceId, getWorkspaceName } from "@/lib/auth";

const STATIC_MENU_ITEMS = [
  { icon: "space_dashboard", label: "Dashboard", href: "/dashboard" },
  { icon: "receipt_long", label: "Transactions", href: "/transactions" },
  { icon: "account_balance_wallet", label: "Accounts", href: "/accounts" },
  { icon: "donut_small", label: "Budgets", href: "/budgets" },
  { icon: "bar_chart_4_bars", label: "Reports", href: "/reports" },
  { icon: "event_repeat", label: "Planned Payments", href: "/planned-payments" },
];

const wealthItems = [
  { icon: "diamond", label: "Assets", href: "/assets" },
  { icon: "trending_down", label: "Liabilities", href: "/liabilities" },
  { icon: "monitoring", label: "Net Worth", href: "/net-worth" },
];

interface NavItemProps {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

function NavItem({ icon, label, href, badge }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className="relative flex items-center gap-3 px-[11px] py-[10px] rounded-[11px] transition-colors"
      style={{
        background: active ? "rgba(99,102,241,0.14)" : undefined,
        color: active ? "#EEF1F6" : "#98A2B3",
        textDecoration: "none",
      }}
    >
      {active && (
        <span
          className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-[2px]"
          style={{ background: "#6366F1" }}
        />
      )}
      <Icon name={icon} size={20} weight={active ? 400 : 300} className={active ? "text-[#818CF8]" : ""} />
      <span className="text-[13.5px]" style={{ fontWeight: active ? 600 : 500 }}>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span
          className="ml-auto text-[10.5px] font-semibold px-[7px] py-[2px] rounded-full"
          style={{ color: "#FBBF24", background: "rgba(251,191,36,0.14)" }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

interface WorkspaceItem {
  id: string;
  name: string;
  ownerId: string;
  members: { userId: string; role: number }[];
}

export function Sidebar() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [paymentsBadge, setPaymentsBadge] = useState(0);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    setDisplayName(getUserDisplayName());
    setEmail(getUserEmail());
    setWorkspaceName(getWorkspaceName());
    setUserId(getUserId());
    const wsId = getWorkspaceId() ?? "";
    setWorkspaceId(wsId);

    // Load all workspaces for the switcher
    api.get<WorkspaceItem[]>("/api/workspaces")
      .then(setWorkspaces)
      .catch(() => {});

    if (wsId) {
      api.get<{ isPaid: boolean; dueDate: string }[]>(`/api/workspaces/${wsId}/planned-payments`)
        .then((payments) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const count = payments.filter((p) => !p.isPaid && new Date(p.dueDate) <= new Date(today.getTime() + 7 * 86400000)).length;
          setPaymentsBadge(count);
        })
        .catch(() => {});
    }
  }, []);

  function switchWorkspace(ws: WorkspaceItem) {
    import("@/lib/auth").then(({ setWorkspaceSession }) => {
      setWorkspaceSession({ id: ws.id, name: ws.name });
      setWorkspaceId(ws.id);
      setWorkspaceName(ws.name);
      setSwitcherOpen(false);
      router.refresh();
      // Navigate to dashboard so all data reloads for the new workspace
      router.push("/dashboard");
    });
  }

  const menuItems = STATIC_MENU_ITEMS.map((item) =>
    item.href === "/planned-payments" ? { ...item, badge: paymentsBadge } : item
  );

  function handleSignOut() {
    clearAuth();
    router.push("/login");
  }

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <aside
      className="w-[248px] flex-shrink-0 flex flex-col h-full"
      style={{ background: "#0E121B", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-[11px] px-[8px] pt-5 pb-[18px]">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6366F1,#2DD4BF)" }}
        >
          <span className="font-[800] text-[18px]" style={{ fontFamily: "'Inter Tight'", color: "#0B0E14" }}>W</span>
        </div>
        <span className="font-[800] text-[19px] tracking-tight" style={{ fontFamily: "'Inter Tight'" }}>Nest</span>
      </div>

      {/* Workspace switcher */}
      <div className="relative mx-[14px] mb-[18px]">
        <button
          onClick={() => setSwitcherOpen((o) => !o)}
          className="w-full flex items-center gap-[10px] rounded-[12px] px-[11px] py-[9px] transition-colors hover:bg-[#1A1F2E]"
          style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(99,102,241,0.18)" }}
          >
            <Icon name="groups" size={17} className="text-[#818CF8]" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[12.5px] font-semibold text-[#EEF1F6] truncate">
              {workspaceName || "My Workspace"}
            </div>
            <div className="text-[10.5px] text-[#5B6573]">{workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}</div>
          </div>
          <Icon name={switcherOpen ? "expand_less" : "unfold_more"} size={18} className="text-[#5B6573] flex-shrink-0" />
        </button>

        {switcherOpen && workspaces.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-[12px] overflow-hidden z-50"
            style={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
          >
            {workspaces.map((ws) => {
              const myMember = ws.members.find((m) => m.userId === userId);
              const roleLabel = myMember?.role === 0 ? "Owner" : myMember?.role === 1 ? "Editor" : "Viewer";
              return (
                <button
                  key={ws.id}
                  onClick={() => switchWorkspace(ws)}
                  className="w-full flex items-center gap-[10px] px-[11px] py-[9px] transition-colors hover:bg-[rgba(99,102,241,0.1)] text-left"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0"
                    style={{ background: ws.id === workspaceId ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.07)" }}
                  >
                    <Icon name="groups" size={15} style={{ color: ws.id === workspaceId ? "#818CF8" : "#5B6573" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold truncate" style={{ color: ws.id === workspaceId ? "#EEF1F6" : "#C4CBD6" }}>
                      {ws.name}
                    </div>
                    <div className="text-[10.5px] text-[#5B6573]">{roleLabel}</div>
                  </div>
                  {ws.id === workspaceId && <Icon name="check" size={15} style={{ color: "#818CF8" }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="px-[14px]">
        <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#4B5462] px-[10px] pb-2">Menu</div>
        <div className="flex flex-col gap-[2px]">
          {menuItems.map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </div>

        {/* Wealth */}
        <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#4B5462] px-[10px] pb-2 pt-[18px]">Wealth</div>
        <div className="flex flex-col gap-[2px]">
          {wealthItems.map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-auto px-[14px] pb-5">
        <NavItem icon="settings" label="Settings" href="/settings" />
        <div className="h-px my-[10px] mx-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div
          className="flex items-center gap-[11px] px-2 py-[6px] rounded-[10px] cursor-pointer group transition-colors hover:bg-[#141925]"
          onClick={handleSignOut}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#FB7185,#A78BFA)", color: "#0B0E14" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold truncate">{displayName || "User"}</div>
            <div className="text-[10.5px] text-[#5B6573] truncate">{email}</div>
          </div>
          <Icon name="logout" size={18} className="text-[#5B6573] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </aside>
  );
}
