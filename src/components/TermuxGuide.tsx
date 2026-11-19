import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { BotConfig } from '../types';

interface TermuxGuideProps {
  config: BotConfig;
  onDownloadBundle: () => void;
}

export const TermuxGuide: React.FC<TermuxGuideProps> = ({ config, onDownloadBundle }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyCommand = async (id: string, cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    window.setTimeout(() => setCopiedCmd(null), 1800);
  };

  const nativeCommands = `pkg update -y && pkg upgrade -y
pkg install -y tur-repo nodejs-lts chromium
mkdir -p ~/gpay-closer && cd ~/gpay-closer
npm init -y && npm install playwright-core`;

  const prootCommands = `pkg update -y && pkg install -y proot-distro
proot-distro install ubuntu
proot-distro login ubuntu
# Di dalam Ubuntu:
apt update && apt install -y nodejs npm chromium fonts-liberation
mkdir -p ~/gpay-closer && cd ~/gpay-closer
npm init -y && npm install playwright-core`;

  const runCommands =
    config.runtime === 'proot'
      ? `proot-distro login ubuntu -- bash -c "cd ~/gpay-closer && node bot.mjs"`
      : `cd ~/gpay-closer && node bot.mjs`;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-200">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Panduan Instalasi & Menjalankan Playwright di Termux Android
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Playwright standar gagal mengunduh Chromium di Android ARM64. Gunakan{' '}
            <span className="font-mono text-slate-700">playwright-core</span> + Chromium sistem Termux agar berjalan stabil.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownloadBundle}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Unduh 1-File Installer (.sh)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jalur 1: Native Termux */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Opsi A: Termux Native (tur-repo Chromium)
            </h3>
            <button
              type="button"
              onClick={() => copyCommand('native', nativeCommands)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {copiedCmd === 'native' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'native' ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Paling ringan karena langsung memakai paket Chromium hasil kompilasi resmi Termux User Repository (<span className="font-mono">tur-repo</span>).
          </p>
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{nativeCommands}</code>
          </pre>
        </div>

        {/* Jalur 2: Proot Ubuntu */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Opsi B: Termux proot-distro (Ubuntu ARM64)
            </h3>
            <button
              type="button"
              onClick={() => copyCommand('proot', prootCommands)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {copiedCmd === 'proot' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'proot' ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Gunakan opsi ini jika perangkat Anda mengalami error shared library Android saat menjalankan Chromium native.
          </p>
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{prootCommands}</code>
          </pre>
        </div>
      </div>

      {/* Cara Menjalankan */}
      <div className="pt-5 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Menjalankan Bot di Termux
            </h3>
            <button
              type="button"
              onClick={() => copyCommand('run', runCommands)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {copiedCmd === 'run' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'run' ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Letakkan file <span className="font-mono text-slate-800">bot.mjs</span> dan{' '}
            <span className="font-mono text-slate-800">accounts.json</span> di folder{' '}
            <span className="font-mono text-slate-800">~/gpay-closer</span> (atau jalankan file{' '}
            <span className="font-mono text-slate-800">install-gpay-bot.sh</span> via{' '}
            <span className="font-mono text-slate-800">bash ~/storage/downloads/install-gpay-bot.sh</span>).
          </p>
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3.5 text-xs font-mono overflow-x-auto">
            <code>{runCommands}</code>
          </pre>
        </div>

        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-900">
            Catatan Penting Saat Eksekusi
          </div>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            <li>
              Pastikan jam HP Android disetel otomatis agar kode 6-digit TOTP Base32 cocok dengan server Google.
            </li>
            <li>
              Jika terjadi error pada salah satu akun, bot otomatis menyimpan tangkapan layar{' '}
              <span className="font-mono text-slate-800">error-1.png</span> untuk diagnosa cepat.
            </li>
            <li>
              Disarankan menguji 1 akun dengan mode <strong>Dry Run</strong> aktif terlebih dahulu.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
