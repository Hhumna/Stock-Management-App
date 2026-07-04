import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Tag, 
  Truck, 
  ArrowRightLeft, 
  Settings, 
  LogOut, 
  BarChart3,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Badge from './Badge';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/products',     icon: Package,         label: 'Products'     },
  { to: '/categories',   icon: Tag,             label: 'Categories'   },
  { to: '/suppliers',    icon: Truck,           label: 'Suppliers'    },
  { to: '/transactions', icon: ArrowRightLeft,  label: 'Transactions' },
];

export default function AppShell() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Fetch low stock count for notification bell icon
  useEffect(() => {
    if (!token) return;
    
    const fetchLowStockCount = async () => {
      try {
        const res = await api.get('/products/low-stock');
        if (res.data?.success) {
          setLowStockCount(res.data.data.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch low stock count for bell badge:', error);
      }
    };

    fetchLowStockCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchLowStockCount, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-textMain">
      
      {/* ── Left Sidebar (Desktop / Tablet) ── */}
      <aside className={`hidden md:flex flex-col bg-brand-slate text-slate-300 border-r border-slate-800 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } shrink-0 sticky top-0 h-screen overflow-y-auto`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 h-16 shrink-0 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <BarChart3 className="text-brand-accent shrink-0" size={24} />
            {!isCollapsed && (
              <span className="font-extrabold text-white text-lg tracking-tight whitespace-nowrap">
                StockFlow
              </span>
            )}
          </div>
          
          {/* Collapse toggle (Desktop only) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="text-slate-400 hover:text-white transition-colors"
          >
            {!isCollapsed ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5" aria-label="Main sidebar navigation">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-accent text-white font-semibold' 
                    : 'hover:bg-brand-slateLight text-slate-400 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Bottom */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-1">
          <NavLink 
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-accent text-white font-semibold' 
                  : 'hover:bg-brand-slateLight text-slate-400 hover:text-white'
              }`
            }
            aria-label="Settings"
          >
            <Settings size={18} className="shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors w-full text-left"
            aria-label="Logout"
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Left Off-canvas Sidebar (Mobile) ── */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setIsMobileOpen(false)} />
          
          {/* Drawer Content */}
          <aside className="relative flex flex-col bg-brand-slate text-slate-300 w-64 max-w-xs h-full p-5 border-r border-slate-800 z-10 transition-transform duration-300">
            <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-brand-accent" size={24} />
                <span className="font-extrabold text-white text-lg tracking-tight">StockFlow</span>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 flex flex-col gap-1.5" aria-label="Mobile sidebar navigation">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
                      isActive 
                        ? 'bg-brand-accent text-white font-semibold' 
                        : 'hover:bg-brand-slateLight text-slate-400 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="pt-5 border-t border-slate-800 flex flex-col gap-1">
              <NavLink 
                to="/settings"
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
                    isActive 
                      ? 'bg-brand-accent text-white font-semibold' 
                      : 'hover:bg-brand-slateLight text-slate-400 hover:text-white'
                  }`
                }
                aria-label="Settings"
              >
                <Settings size={18} />
                <span>Settings</span>
              </NavLink>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors w-full text-left"
                aria-label="Logout"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content wrapper (Navbar + Outlet) ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-brand-border h-16 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button 
              onClick={() => setIsMobileOpen(true)} 
              className="md:hidden text-brand-textMain hover:bg-slate-50 p-2 rounded-md transition-colors"
            >
              <Menu size={20} />
            </button>
            
            {/* Navigation context title indicator */}
            <span className="hidden sm:inline-block font-semibold text-slate-800 text-sm bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
              Branch: Local Warehouse
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <div className="relative cursor-pointer text-brand-textMuted hover:text-brand-textMain p-1.5 rounded-full hover:bg-slate-50 transition-all duration-200">
              <Bell size={20} />
              {lowStockCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold border-2 border-white">
                  {lowStockCount}
                </span>
              )}
            </div>

            {/* Separator line */}
            <div className="h-6 w-px bg-brand-border" />

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-sm font-semibold text-brand-textMain">
                  {user?.name || 'Guest User'}
                </span>
                <span className="text-xs text-brand-textMuted capitalize">
                  {user?.role || 'Visitor'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm select-none border border-emerald-600 shadow-sm uppercase">
                {user?.name ? user.name.slice(0, 2) : 'GU'}
              </div>
            </div>
          </div>
        </header>

        {/* Layout page contents */}
        <main className="flex-1 p-6 md:p-8 bg-brand-bg overflow-y-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
