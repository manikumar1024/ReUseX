import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationStore } from '../../store';
import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../../api';
import {
  LayoutDashboard, Search, PackagePlus, Layers, BookOpen,
  Package, TrendingUp, Bell, ShieldCheck, LogOut,
  Cpu, Settings, X, Menu, Network, User
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/app',           icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/app/search',    icon: Search,          label: 'Discover'                   },
  { to: '/app/resources', icon: Package,         label: 'My Resources'               },
  { to: '/app/loans',     icon: Layers,          label: 'My Loans'                   },
  { to: '/app/post-need', icon: PackagePlus,     label: 'Post a Need'                },
  { to: '/app/planner',   icon: Cpu,             label: 'Project Planner'            },
  { to: '/app/knowledge', icon: BookOpen,        label: 'Knowledge'                  },
  { to: '/app/impact',    icon: TrendingUp,      label: 'Impact'                     },
  { to: '/app/profile',   icon: User,            label: 'Profile'                    },
  { to: '/app/architecture', icon: Network,      label: 'Architecture'               },
];

const ADMIN_ITEMS = [
  { to: '/app/admin',          icon: Settings,    label: 'Admin Dashboard' },
  { to: '/app/purchase-check', icon: ShieldCheck, label: 'Purchase Check'  },
];

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center flex-shrink-0">
        <span className="text-brand font-bold text-xs leading-none">RX</span>
      </div>
      {!collapsed && (
        <span className="font-semibold text-white text-[15px] tracking-tight">ReUseX</span>
      )}
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  badge?: number;
}

function SidebarNavItem({ to, icon: Icon, label, end, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-175',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:bg-white/7 hover:text-white/90'
      )}
    >
      <Icon size={16} className="flex-shrink-0" />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto w-4.5 h-4.5 bg-accent text-brand text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = ['campus_admin', 'department_admin'].includes(user?.role || '');

  useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await notificationApi.list(true);
      setUnreadCount(res.data.unread_count || 0);
      return res.data;
    },
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <Logo />
          <button
            className="lg:hidden text-white/50 hover:text-white p-1"
            onClick={() => setMobileOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5 no-scrollbar">
        {NAV_ITEMS.map(item => (
          <SidebarNavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
            badge={item.to === '/app/notifications' ? unreadCount : undefined}
          />
        ))}

        {isAdmin && (
          <>
            <div className="px-3 pt-5 pb-1.5">
              <span className="text-white/25 text-[10px] uppercase tracking-widest font-semibold">
                Admin
              </span>
            </div>
            {ADMIN_ITEMS.map(item => (
              <SidebarNavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <NavLink
            to="/app/profile"
            className="flex items-center gap-2.5 flex-1 min-w-0 group hover:opacity-90 transition-opacity"
            title="View & Edit Profile"
          >
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:ring-1 group-hover:ring-accent">
              <span className="text-accent text-xs font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[13px] font-medium truncate leading-tight group-hover:text-accent transition-colors">
                {user?.name}
              </div>
              <div className="text-white/40 text-[11px] capitalize truncate">
                {user?.role?.replace(/_/g, ' ')}
              </div>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="text-white/30 hover:text-white/70 p-1 transition-colors rounded-md"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 bg-brand flex-col h-full">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-52 bg-brand flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar (mobile) */}
        <header className="flex lg:hidden items-center justify-between px-4 h-12 bg-surface border-b border-border flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-ink-muted hover:text-ink p-1"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <Logo />
          <NavLink to="/app/notifications" className="relative p-1 text-ink-muted hover:text-ink">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-accent text-brand text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-between px-6 h-12 bg-surface border-b border-border flex-shrink-0">
          <div className="text-sm text-ink-muted">
            Welcome back,{' '}
            <span className="text-ink font-medium">{user?.name?.split(' ')[0]}</span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink
              to="/app/notifications"
              className="relative p-2 text-ink-muted hover:text-ink rounded-lg hover:bg-surface-muted transition-colors"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-accent text-brand text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
