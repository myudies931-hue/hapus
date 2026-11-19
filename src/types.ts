export interface AccountEntry {
  id: string;
  email: string;
  password: string;
  totpSecret: string;
}

export type TermuxRuntime = 'native' | 'proot';
export type BrowserMode = 'headless' | 'headed';
export type LanguageMode = 'auto' | 'id' | 'en';
export type ScriptTab = 'bot.mjs' | 'bot.py' | 'setup-termux.sh' | 'accounts.json';

export interface BotConfig {
  runtime: TermuxRuntime;
  browserMode: BrowserMode;
  language: LanguageMode;
  dryRun: boolean;
  stepDelayMs: number;
  maxSkipAttempts: number;
  accounts: AccountEntry[];
}

export interface WorkflowStep {
  number: number;
  title: string;
  summary: string;
  targetUrlOrContext: string;
  selectors: string[];
  notes: string;
  codeAnchor: string;
}
