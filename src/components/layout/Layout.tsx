import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/sleep', label: 'Sleep', icon: '😴' },
  { to: '/social', label: 'Social', icon: '👥' },
  { to: '/insights', label: 'Insights', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Layout() {
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
          <p className="text-xs opacity-60">Tracker</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'hover:bg-black/5'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 md:ml-56 pb-20 md:pb-6">
        <header className="md:hidden sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)' }}
        >
          <h1 className="font-bold" style={{ color: 'var(--text-heading)' }}>Sleep & Social</h1>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-5 md:py-8">
          <Outlet />
        </div>
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t flex justify-around py-2 px-1 z-40"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)' }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium min-w-0 ${
                isActive ? 'text-primary' : 'opacity-70'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
