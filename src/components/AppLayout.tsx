import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, FileText, Users, Settings, LogOut, Building2, Menu, X, Shield, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, organization, organizations, isAdmin, isSuperadmin, switchOrg, signOut } = useAuth();

  const navigation = [
    { to: "/", label: "Pregled", icon: LayoutDashboard, end: true },
    { to: "/invoices", label: "Fakture", icon: FileText },
    { to: "/clients", label: "Klijenti", icon: Users },
    { to: "/settings", label: "Postavke", icon: Settings },
    ...(isAdmin ? [{ to: "/admin", label: "Administracija", icon: Shield }] : []),
  ];

  const handleSwitch = async (id: string) => {
    try { await switchOrg(id); try { sessionStorage.setItem("fakt.orgChosen", id); } catch {} toast.success("Aktivna ustanova promijenjena"); window.location.reload(); }
    catch (e: any) { toast.error(e.message); }
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}` || "U";

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="px-6 py-5 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-display font-bold text-base leading-tight">Faktura</div>
                <div className="text-xs text-sidebar-foreground/60">{organization?.code ?? "Sistem"}</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-smooth",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-sidebar-border space-y-3">
            {organization && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full px-3 py-2 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent text-left transition-smooth">
                    <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60 mb-1">
                      <Building2 className="w-3 h-3" /> Aktivna ustanova {isSuperadmin && <span className="ml-auto text-primary">SUPER</span>}
                    </div>
                    <div className="text-sm font-medium truncate">{organization.code} — {organization.name}</div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Prebaci ustanovu</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {organizations.map((o) => (
                    <DropdownMenuItem key={o.id} onClick={() => handleSwitch(o.id)}>
                      <div className="flex-1">
                        <div className="font-medium">{o.code}</div>
                        <div className="text-xs text-muted-foreground truncate">{o.full_name}</div>
                      </div>
                      {o.id === organization.id && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                  {initials.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile?.first_name} {profile?.last_name}</div>
                <div className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 -ml-2">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="font-display font-bold">Faktura</div>
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
