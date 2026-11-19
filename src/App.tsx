import React, { useRef, useState } from 'react';
import { TopBar, ActiveSection } from './components/TopBar';
import { ConfigPanel } from './components/ConfigPanel';
import { CodeViewer } from './components/CodeViewer';
import { TotpTester } from './components/TotpTester';
import { WorkflowInspector } from './components/WorkflowInspector';
import { TermuxGuide } from './components/TermuxGuide';
import { BotConfig } from './types';
import { generateOneLineBundleCommand } from './utils/scriptGenerator';

const INITIAL_CONFIG: BotConfig = {
  runtime: 'native',
  browserMode: 'headless',
  language: 'auto',
  dryRun: false,
  saveErrorToSdcard: true,
  credentialSource: 'website_tab',
  websiteSource: {
    url: 'https://akun.impura.id/contoh-link',
    emailSelector: '',
    passwordSelector: '',
    totpSelector: '',
    readViaClipboard: false,
  },
  stepDelayMs: 1500,
  maxSkipAttempts: 10,
  accounts: [
    {
      id: 'acc-1',
      url: 'https://akun.impura.id/contoh-link',
      email: '',
      password: '',
      totpSecret: 'JBSWY3DPEHPK3PXP',
    },
  ],
};

export default function App() {
  const [config, setConfig] = useState<BotConfig>(INITIAL_CONFIG);
  const [activeSection, setActiveSection] = useState<ActiveSection>('konfigurasi');
  const [testerSecret, setTesterSecret] = useState<string>('JBSWY3DPEHPK3PXP');
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  const configRef = useRef<HTMLDivElement>(null);
  const alurRef = useRef<HTMLDivElement>(null);
  const otpRef = useRef<HTMLDivElement>(null);
  const panduanRef = useRef<HTMLDivElement>(null);

  const handleSelectSection = (section: ActiveSection) => {
    setActiveSection(section);
    const map: Record<ActiveSection, React.RefObject<HTMLDivElement | null>> = {
      konfigurasi: configRef,
      alur: alurRef,
      otp: otpRef,
      panduan: panduanRef,
    };
    const target = map[section].current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownloadBundle = () => {
    const content = generateOneLineBundleCommand(config);
    const blob = new Blob([content], { type: 'text/x-shellscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'install-gpay-bot.sh';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadFeedback('File install-gpay-bot.sh berhasil diunduh.');
    window.setTimeout(() => setDownloadFeedback(null), 3500);
  };

  const handleTestSecretFromConfig = (secret: string) => {
    setTesterSecret(secret);
    handleSelectSection('otp');
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopBar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onDownloadBundle={handleDownloadBundle}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8 space-y-10">
        {/* Ringkasan Header Halaman */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-medium text-slate-500">
              Playwright Core · Termux Android · Konverter Base32 TOTP 6-Digit
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Generator Skrip Playwright Termux untuk Penutupan Profil Pembayaran
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Susun skrip otomasi 12 langkah yang kompatibel dengan Chromium di Termux, lengkap dengan konverter Base32 Authenticator ke 6-digit OTP serta penanganan pop-up dan iframe.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Total Langkah</div>
              <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
                13 Tahap
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Akun Terdaftar</div>
              <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {config.accounts.length} Akun
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Mode Uji</div>
              <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {config.dryRun ? 'Dry Run' : 'Penuh'}
              </div>
            </div>
          </div>
        </section>

        {downloadFeedback && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg text-sm flex items-center justify-between"
          >
            <span>{downloadFeedback}</span>
            <button
              type="button"
              onClick={() => setDownloadFeedback(null)}
              className="text-xs font-medium underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Workspace 2 Kolom: Konfigurasi & Pratinjau Kode */}
        <div
          ref={configRef}
          className="scroll-mt-24 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start"
        >
          <div className="xl:col-span-5">
            <ConfigPanel
              config={config}
              onChange={setConfig}
              onTestSecret={handleTestSecretFromConfig}
            />
          </div>
          <div className="xl:col-span-7">
            <CodeViewer config={config} />
          </div>
        </div>

        {/* Tester Base32 TOTP 6-Digit */}
        <div ref={otpRef} className="scroll-mt-24">
          <TotpTester secretInput={testerSecret} onSecretChange={setTesterSecret} />
        </div>

        {/* Inspektor 12 Langkah */}
        <div ref={alurRef} className="scroll-mt-24">
          <WorkflowInspector dryRun={config.dryRun} />
        </div>

        {/* Panduan Instalasi Termux */}
        <div ref={panduanRef} className="scroll-mt-24">
          <TermuxGuide config={config} onDownloadBundle={handleDownloadBundle} />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1440px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Termux Playwright Studio · Seluruh kredensial hanya diproses lokal di browser Anda.</span>
          <span className="font-mono">Target: payments.google.com/gp/w/u/0/home/settings</span>
        </div>
      </footer>
    </div>
  );
}
