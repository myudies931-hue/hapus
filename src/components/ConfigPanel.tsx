import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { AccountEntry, BotConfig, BrowserMode, LanguageMode, TermuxRuntime } from '../types';
import { validateBase32Secret } from '../utils/totp';

interface ConfigPanelProps {
  config: BotConfig;
  onChange: (next: BotConfig) => void;
  onTestSecret: (secret: string) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onChange,
  onTestSecret,
}) => {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const updateAccount = (id: string, patch: Partial<AccountEntry>) => {
    onChange({
      ...config,
      accounts: config.accounts.map((acc) => (acc.id === id ? { ...acc, ...patch } : acc)),
    });
  };

  const addAccount = () => {
    const newId = `acc-${Date.now()}`;
    onChange({
      ...config,
      accounts: [
        ...config.accounts,
        {
          id: newId,
          email: '',
          password: '',
          totpSecret: '',
        },
      ],
    });
  };

  const removeAccount = (id: string) => {
    if (config.accounts.length <= 1) return;
    onChange({
      ...config,
      accounts: config.accounts.filter((acc) => acc.id !== id),
    });
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Lingkungan Termux & Parameter Bot */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-5 border-b border-slate-200">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Parameter Eksekusi Termux
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Sesuaikan binary Chromium Android dan perilaku otomasi sebelum menyalin skrip.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
            Playwright Core · Chromium ARM64
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5">
          {/* Runtime Termux */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Metode Runtime Termux
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'native', label: 'Native (tur-repo)' },
                  { id: 'proot', label: 'Proot Ubuntu' },
                ] as { id: TermuxRuntime; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...config, runtime: opt.id })}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    config.runtime === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {config.runtime === 'native'
                ? 'Langsung di Termux via pkg install tur-repo && pkg install chromium.'
                : 'Cocok jika Chromium native gagal jalan di versi Android tertentu.'}
            </p>
          </div>

          {/* Mode Browser */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Tampilan Browser
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'headless', label: 'Headless' },
                  { id: 'headed', label: 'Termux-X11' },
                ] as { id: BrowserMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...config, browserMode: opt.id })}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    config.browserMode === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {config.browserMode === 'headless'
                ? 'Berjalan di latar belakang CLI Termux tanpa GUI.'
                : 'Menampilkan jendela browser melalui aplikasi Termux:X11.'}
            </p>
          </div>

          {/* Bahasa Akun Google */}
          <div>
            <label htmlFor="lang-mode" className="block text-xs font-medium text-slate-700 mb-2">
              Locale Browser & Selector
            </label>
            <select
              id="lang-mode"
              value={config.language}
              onChange={(e) => onChange({ ...config, language: e.target.value as LanguageMode })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="auto">Otomatis (Cocokkan ID + EN)</option>
              <option value="id">Bahasa Indonesia (id-ID)</option>
              <option value="en">English (en-US)</option>
            </select>
          </div>

          {/* Jeda Langkah */}
          <div>
            <label htmlFor="step-delay" className="block text-xs font-medium text-slate-700 mb-2">
              Jeda Antar Langkah (ms)
            </label>
            <input
              id="step-delay"
              type="number"
              min={500}
              max={10000}
              step={250}
              value={config.stepDelayMs}
              onChange={(e) =>
                onChange({
                  ...config,
                  stepDelayMs: Math.max(500, Number(e.target.value) || 1500),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Dry Run Safety Toggle */}
        <div className="mt-5 pt-5 border-t border-slate-200 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900">
              Mode Dry Run (Uji Coba Aman)
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Berhenti tepat sebelum tombol konfirmasi akhir &ldquo;Tutup profil pembayaran&rdquo; diklik.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.dryRun}
            onClick={() => onChange({ ...config, dryRun: !config.dryRun })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              config.dryRun ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                config.dryRun ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Daftar Akun (accounts.json) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-200">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Data Akun & Base32 Secret Key
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Semua data hanya diproses di browser Anda untuk menyusun file{' '}
              <span className="font-mono text-slate-700">accounts.json</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={addAccount}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Akun</span>
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {config.accounts.map((acc, idx) => {
            const secretCheck = acc.totpSecret.trim()
              ? validateBase32Secret(acc.totpSecret)
              : null;
            const isPwdVisible = !!visiblePasswords[acc.id];

            return (
              <div key={acc.id} className="py-5 first:pt-5 last:pb-0 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500 font-mono tabular-nums">
                    Akun #{idx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    {acc.totpSecret.trim() && (
                      <button
                        type="button"
                        onClick={() => onTestSecret(acc.totpSecret)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Uji OTP di Tester
                      </button>
                    )}
                    {config.accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAccount(acc.id)}
                        aria-label={`Hapus akun ${idx + 1}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Email Google
                    </label>
                    <input
                      type="email"
                      value={acc.email}
                      onChange={(e) => updateAccount(acc.id, { email: e.target.value })}
                      placeholder="contoh@gmail.com"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Password Akun
                    </label>
                    <div className="relative">
                      <input
                        type={isPwdVisible ? 'text' : 'password'}
                        value={acc.password}
                        onChange={(e) => updateAccount(acc.id, { password: e.target.value })}
                        placeholder="Masukkan password akun"
                        className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(acc.id)}
                        aria-label={isPwdVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      >
                        {isPwdVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Google Authenticator Base32 Secret Key (atau URI otpauth://)
                  </label>
                  <input
                    type="text"
                    value={acc.totpSecret}
                    onChange={(e) => updateAccount(acc.id, { totpSecret: e.target.value })}
                    placeholder="JBSWY3DPEHPK3PXP atau otpauth://totp/..."
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  {secretCheck && !secretCheck.valid && (
                    <p className="text-xs text-red-600 mt-1.5">{secretCheck.error}</p>
                  )}
                  {secretCheck && secretCheck.valid && (
                    <p className="text-xs text-emerald-700 mt-1.5">
                      Base32 valid ({secretCheck.normalized.length} karakter) — siap dikonversi ke 6-digit TOTP.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
