import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { BotConfig, ScriptTab } from '../types';
import {
  generateAccountsJson,
  generateBotMjs,
  generateBotPy,
  generateSetupTermuxScript,
} from '../utils/scriptGenerator';

interface CodeViewerProps {
  config: BotConfig;
}

const TABS: { id: ScriptTab; label: string; subtitle: string }[] = [
  { id: 'bot.mjs', label: 'bot.mjs', subtitle: 'Node.js Playwright Core + TOTP (Disarankan)' },
  { id: 'accounts.json', label: 'accounts.json', subtitle: 'Kredensial Email, Password & Base32 Key' },
  { id: 'setup-termux.sh', label: 'setup-termux.sh', subtitle: 'Instalasi Otomatis di Termux' },
  { id: 'bot.py', label: 'bot.py', subtitle: 'Alternatif Python + pyotp' },
];

export const CodeViewer: React.FC<CodeViewerProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<ScriptTab>('bot.mjs');
  const [copied, setCopied] = useState(false);

  const getContent = (tab: ScriptTab): string => {
    switch (tab) {
      case 'bot.mjs':
        return generateBotMjs(config);
      case 'accounts.json':
        return generateAccountsJson(config);
      case 'setup-termux.sh':
        return generateSetupTermuxScript(config);
      case 'bot.py':
        return generateBotPy(config);
    }
  };

  const currentCode = getContent(activeTab);
  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeTab;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lineCount = currentCode.split('\n').length;

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-slate-100">
      {/* File Tabs Bar */}
      <div className="px-4 pt-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-mono font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-500 text-white bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSingle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh {activeTab}</span>
          </button>
        </div>
      </div>

      {/* File Context Header */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>{activeMeta.subtitle}</span>
        <span className="font-mono tabular-nums">{lineCount} baris</span>
      </div>

      {/* Code Viewport */}
      <div className="max-h-[640px] overflow-auto p-4 text-xs leading-relaxed">
        <pre className="font-mono text-slate-200 whitespace-pre">
          <code>{currentCode}</code>
        </pre>
      </div>
    </section>
  );
};
