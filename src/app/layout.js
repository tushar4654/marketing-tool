'use client';
import { usePathname } from 'next/navigation';
import './globals.css';

const NAV = [
  { href: '/', icon: '✨', label: 'Today's Brief' },
  { href: '/content-sources', icon: '📡', label: 'Content Sources' },
  { href: '/content-feed',    icon: '📰', label: 'All Feed' },
  { href: '/personas',        icon: '👤', label: 'Personas' },
  { href: '/suggestions',     icon: '💡', label: 'Suggestions' },
  { href: '/trending',        icon: '🔥', label: 'Trending' },
  { href: '/settings',        icon: '⚙', label: 'Settings' },
];

function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <a href="/" className="logo-mark">
          <div className="logo-icon">⚡</div>
          <div>
            <span className="logo-name">Content Engine</span>
            <span className="logo-sub">AI-Powered Intelligence</span>
          </div>
        </a>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(n => {
          const active = n.href === '/' ? path === '/' : path === n.href || path.startsWith(n.href + '/');
          return (
            <a key={n.href} href={n.href} className={active ? 'active' : ''}>
              <span>{n.icon}</span>
              {n.label}
            </a>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div style={{ color: 'var(--green)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          Connected
        </div>
        <div>v3.0 · AI-Powered</div>
      </div>
    </aside>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Content Engine — AI-Powered Social Intelligence</title>
        <meta name="description" content="Scrape LinkedIn, Twitter, and blogs. Get AI-powered posting suggestions for your team." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
