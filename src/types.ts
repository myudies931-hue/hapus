export interface AccountEntry {
  id: string;
  url: string;
  email: string;
  password: string;
  totpSecret: string;
}

export type TermuxRuntime = 'native' | 'proot';
export type BrowserMode = 'headless' | 'headed';
export type LanguageMode = 'auto' | 'id' | 'en';
export type ScriptTab = 'bot.mjs' | 'bot.py' | 'setup-termux.sh' | 'accounts.json';
export type CredentialSource = 'accounts_json' | 'website_tab';

export interface WebsiteSourceConfig {
  url: string;
  emailSelector: string;
  passwordSelector: string;
  totpSelector: string;
  readViaClipboard: boolean;
}

export interface BotConfig {
  runtime: TermuxRuntime;
  browserMode: BrowserMode;
  language: LanguageMode;
  dryRun: boolean;
  saveErrorToSdcard: boolean;
  credentialSource: CredentialSource;
  websiteSource: WebsiteSourceConfig;
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
