import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { Menu, X, Home, FileText, Upload, Users, CheckCircle, ShoppingCart, Settings, Layers, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser, logout } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useCampaign } from "../lib/CampaignContext";

export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCampaign } = useCampaign();
  const [user, setUser] = useState(getCurrentUser());
  const [approvalsBadgeCount, setApprovalsBadgeCount] = useState(2);
  const [ordersBadgeCount, setOrdersBadgeCount] = useState(0);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);

    // Initialize badge count from localStorage
    const storedCount = localStorage.getItem("xw_approvals_count");
    if (storedCount) {
      setApprovalsBadgeCount(parseInt(storedCount, 10));
    }

    // Fetch pending orders badge
    const campaignId = localStorage.getItem("xw_campaign_id");
    if (campaignId) {
      supabase
        .from("client_selections")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("decision", "Pending")
        .then(({ count }) => setOrdersBadgeCount(count ?? 0));
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedCount = localStorage.getItem("xw_approvals_count");
      if (storedCount) {
        setApprovalsBadgeCount(parseInt(storedCount, 10));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSwitchRole = () => {
    logout();
    navigate("/login");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const opsNavItems = [
    { path: "/", label: "Campaigns", icon: Layers, count: 0, requiresCampaign: false },
    { path: "/dashboard", label: "Dashboard", icon: Home, count: 0, requiresCampaign: false },
    { path: "/brief", label: "Brief", icon: FileText, count: 0, requiresCampaign: true },
    { path: "/import", label: "Import", icon: Upload, count: 0, requiresCampaign: true },
    { path: "/pipeline", label: "Pipeline", icon: Users, count: 0, requiresCampaign: true },
    { path: "/activations", label: "Activations", icon: ShoppingCart, count: 0, requiresCampaign: true },
    { path: "/settings", label: "Settings", icon: Settings, count: 0, requiresCampaign: false },
  ];

  const leadNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home, count: 0, requiresCampaign: false },
    { path: "/approvals", label: "Approvals", icon: CheckCircle, count: approvalsBadgeCount, requiresCampaign: false },
    { path: "/orders", label: "Orders", icon: ShoppingCart, count: ordersBadgeCount, requiresCampaign: false },
    { path: "/brief", label: "Brief", icon: FileText, count: 0, requiresCampaign: false },
    { path: "/settings", label: "Settings", icon: Settings, count: 0, requiresCampaign: false },
  ];

  const navItems = user?.role === "ops" ? opsNavItems : leadNavItems;

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0 lg:w-64"
        } bg-white border-r border-border transition-all duration-300 overflow-hidden flex flex-col fixed lg:relative h-full z-50 lg:z-auto`}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl tracking-tight" style={{ color: "#038B97" }}>
              XW Admin
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-muted rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground">
              {user.name}
            </div>
            <button
              onClick={handleSwitchRole}
              className="text-xs text-[#038B97] hover:underline"
            >
              Switch role
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.path === "/"
              ? location.pathname === "/" || location.pathname === "/campaigns"
              : location.pathname === item.path;
            const Icon = item.icon;
            const needsCampaign = (item as any).requiresCampaign;
            const effectivePath = needsCampaign && !activeCampaign ? "/campaigns" : item.path;
            return (
              <NavLink
                key={item.path}
                to={effectivePath}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "border-l-4 border-[#038B97] bg-[#038B97]/5 text-[#038B97]"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-[#038B97] text-white">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="lg:hidden p-4 border-b border-border bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
