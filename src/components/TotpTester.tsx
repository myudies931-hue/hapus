import React, { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { generateTotpBrowser, TotpResult, validateBase32Secret } from '../utils/totp';

interface TotpTesterProps {
  secretInput: string;
  onSecretChange: (value: string) => void;
}

export const TotpTester: React.FC<TotpTesterProps> = ({ secretInput, onSecretChange }) => {
  const [result, setResult] = useState<TotpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const tick = async () => {
      const validation = validateBase32Secret(secretInput);
      if (!validation.valid) {
        if (active) {
          setResult(null);
          setError(secretInput.trim() ? validation.error || 'Format Base32 tidak valid.' : null);
        }
        return;
      }

      try {
        const res = await generateTotpBrowser(secretInput, Date.now());
        if (active) {
          setResult(res);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setResult(null);
          setError(err instanceof Error ? err.message : 'Gagal menghitung OTP.');
        }
      }
    };

    tick();
    const timer = window.setInterval(tick, 500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [secretInput]);

  const handleCopyOtp = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const progressPercent = result ? (result.remainingSeconds / result.period) * 100 : 0;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-5 border-b border-slate-200">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Tester Konverter Base32 → 6-Digit Google Authenticator
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Verifikasi langsung apakah Secret Key Base32 Anda menghasilkan kode 6 digit yang sama dengan aplikasi Authenticator di HP.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSecretChange('JBSWY3DPEHPK3PXP')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Pakai Contoh Uji</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
        <div className="lg:col-span-7 space-y-3">
          <label htmlFor="totp-tester-input" className="block text-xs font-medium text-slate-700">
            Secret Key Base32 (16/32 karakter atau URL otpauth://)
          </label>
          <input
            id="totp-tester-input"
            type="text"
            value={secretInput}
            onChange={(e) => onSecretChange(e.target.value)}
            placeholder="Contoh: JBSWY3DPEHPK3PXP"
            className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
          <div className="text-xs text-slate-500">
            Algoritma: RFC 6238 TOTP · HMAC-SHA1 · 6 Digit · Periode 30 detik (identik dengan fungsi <span className="font-mono text-slate-700">generateTOTP()</span> di <span className="font-mono text-slate-700">bot.mjs</span>).
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Kode 6-Digit Saat Ini</span>
            <span className="font-mono tabular-nums">
              {result ? `Reset dalam ${result.remainingSeconds}s` : 'Menunggu key'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 my-2">
            <div className="font-mono text-3xl sm:text-4xl font-semibold tracking-[0.18em] tabular-nums text-white">
              {result ? `${result.code.slice(0, 3)} ${result.code.slice(3)}` : '--- ---'}
            </div>

            <button
              type="button"
              disabled={!result}
              onClick={handleCopyOtp}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-4">
            <div
              className={`h-full transition-all duration-300 ${
                result && result.remainingSeconds <= 5 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            {result && result.remainingSeconds <= 4
              ? 'Sisa waktu <= 4s: Bot otomatis menunggu siklus baru agar OTP tidak kedaluwarsa saat dikirim.'
              : 'Pastikan jam perangkat Termux sinkron (otomatis via jaringan) agar kode TOTP akurat.'}
          </p>
        </div>
      </div>
    </section>
  );
};
