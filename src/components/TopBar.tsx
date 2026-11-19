import React from 'react';
import { Download } from 'lucide-react';

export type ActiveSection = 'konfigurasi' | 'alur' | 'otp' | 'panduan';

interface TopBarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  onDownloadBundle: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onSelectSection,
  onDownloadBundle,
}) => {
  const navItems: { id: ActiveSection; label: string }[] = [
    { id: 'konfigurasi', label: 'Konfigurasi' },
    { id: 'alur', label: 'Alur 12 Langkah' },
    { id: 'otp', label: 'Tester OTP' },
    { id: 'panduan', label: 'Panduan Termux' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('konfigurasi');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
        >
          Termux Playwright Studio
        </a>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-blue-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onDownloadBundle}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Unduh Paket Termux</span>
          </button>
        </div>
      </div>

      {/* Mobile section tabs */}
      <div className="md:hidden border-t border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
