import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';

const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'dashboard' },
  { to: '/sleep', label: 'Sleep', icon: 'sleep' },
  { to: '/social', label: 'Social', icon: 'social' },
  { to: '/insights', label: 'Insights', icon: 'insights' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const pageTitles: Record<string, string> = {
  '/sleep': 'Sleep',
  '/social': 'Social',
  '/insights': 'Insights',
  '/settings': 'Settings',
};

export function Layout() {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';
  const pageTitle = pageTitles[pathname];

  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <aside
        className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r p-4"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)' }}
      >
        <div className="mb-8 px-2">
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
            Sleep & Social
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tracker</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'hover:bg-black/5'
                }`
              }
            >
              <Icon name={item.icon} size={18} />
              {item.label === 'Home' ? 'Dashboard' : item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 md:ml-56 ios-main-pad">
        {!isDashboard && (
          <header
            className="md:hidden sticky top-0 z-40 border-b ios-header pb-2.5 ios-blur"
            style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)' }}
          >
            <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: 'var(--text-heading)' }}>
              {pageTitle}
            </h1>
          </header>
        )}
        <div className={`max-w-6xl mx-auto ios-content ${isDashboard ? 'pt-0 pb-4 md:py-8' : 'py-4 md:py-8'}`}>
          <Outlet />
        </div>
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t ios-tab-bar ios-blur z-40"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex justify-around items-stretch pt-1.5" style={{ minHeight: 'var(--tab-bar-height)' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 py-0.5 transition-colors ${
                  isActive ? 'text-primary' : ''
                }`
              }
              style={({ isActive }) => ({ color: isActive ? undefined : 'var(--text-muted)' })}
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} size={22} className={isActive ? 'text-primary' : ''} />
                  <span className={`text-[10px] leading-tight truncate max-w-full ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
