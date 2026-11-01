import type { ReactNode } from 'react';
import { useTheme } from '../contexts/useTheme';
import type { Sport } from '../types/game';

interface SidebarProps {
  activePage: Sport;
  onPageChange: (page: Sport) => void;
}

const iconProps = { className: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, 'aria-hidden': true } as const;

const PAGES: Array<{ id: Sport; label: string; icon: ReactNode }> = [
  {
    id: 'soccer',
    label: 'Soccer',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinejoin="round" d="m12 8 3.5 2.5-1.3 4h-4.4l-1.3-4L12 8ZM12 3v5M15.5 10.5l5-1.5M14.2 14.5l3 4M9.8 14.5l-3 4M8.5 10.5 3.5 9" />
      </svg>
    ),
  },
  {
    id: 'basketball',
    label: 'Basketball',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8" />
      </svg>
    ),
  },
];

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const { isDarkTheme, toggleTheme } = useTheme();
  const idle = isDarkTheme ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-black/5 hover:text-slate-900';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center gap-2 border-r py-4 ${
        isDarkTheme ? 'border-white/10 bg-[#161616]' : 'border-black/10 bg-white'
      }`}
    >
      <nav aria-label="Pages" className="flex flex-1 flex-col items-center justify-center gap-2">
        {PAGES.map((page) => {
          const isActive = page.id === activePage;
          return (
            <button
              key={page.id}
              type="button"
              title={page.label}
              aria-label={page.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onPageChange(page.id)}
              className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-slate-700 text-white' : idle
              }`}
            >
              {page.icon}
            </button>
          );
        })}
      </nav>
      <div className="group relative">
        <button
          type="button"
          aria-label="About stream content"
          aria-describedby="stream-disclaimer"
          className={`inline-flex h-10 w-10 cursor-help items-center justify-center rounded-lg text-sm font-bold transition-colors ${idle}`}
        >
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 11v5M12 8h.01" />
          </svg>
        </button>
        <span
          id="stream-disclaimer"
          role="tooltip"
          className={`pointer-events-none absolute bottom-0 left-12 z-50 hidden w-72 rounded-md border p-3 text-left text-xs font-normal leading-relaxed shadow-xl group-focus-within:block group-hover:block ${
            isDarkTheme ? 'border-white/15 bg-[#252525] text-slate-200' : 'border-black/10 bg-white text-slate-600'
          }`}
        >
          Stream content is provided by external sources. sportix.live does not host, store, or control the third-party streams. Availability and legality may vary by source and location.
        </span>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
        className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ${idle}`}
      >
        {isDarkTheme ? (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 12.8A8.5 8.5 0 1111.2 3 6.7 6.7 0 0021 12.8z" />
          </svg>
        )}
      </button>
    </aside>
  );
}
