import { Outlet, NavLink, useLocation } from "react-router";
import { Menu, X, Home, FileText, Upload, Layers, Handshake, CheckCircle, ShoppingCart } from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home, count: 0 },
  { path: "/", label: "Brief", icon: FileText, count: 0 },
  { path: "/import", label: "Import", icon: Upload, count: 0 },
  { path: "/pipeline", label: "Pipeline", icon: Layers, count: 47 },
  { path: "/negotiate", label: "Negotiate", icon: Handshake, count: 12 },
  { path: "/qualify", label: "Qualify", icon: CheckCircle, count: 8 },
  { path: "/push-to-client", label: "Push to Client", icon: Upload, count: 5 },
  { path: "/orders", label: "Orders", icon: ShoppingCart, count: 15 },
];

export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const location = useLocation();

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
          sidebarOpen ? "w-64" : "w-0 lg:w-0"
        } bg-white border-r border-border transition-all duration-300 overflow-hidden flex flex-col fixed lg:relative h-full z-50 lg:z-auto`}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
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
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
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
                  <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
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
