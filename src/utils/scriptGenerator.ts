import { BotConfig } from '../types';
import { extractBase32Secret } from './totp';

function sanitizeAccounts(config: BotConfig) {
  return config.accounts.map((acc) => ({
    email: acc.email.trim() || 'email-anda@gmail.com',
    password: acc.password || 'PASSWORD_AKUN_ANDA',
    totpSecret: extractBase32Secret(acc.totpSecret) || 'JBSWY3DPEHPK3PXP',
  }));
}

export function generateAccountsJson(config: BotConfig): string {
  return JSON.stringify(sanitizeAccounts(config), null, 2);
}

export function generateSetupTermuxScript(config: BotConfig): string {
  if (config.runtime === 'proot') {
    return `#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=== [1/4] Update paket Termux & pasang proot-distro ==="
pkg update -y && pkg upgrade -y
pkg install -y proot-distro

echo "=== [2/4] Pasang Ubuntu ARM64 (jika belum ada) ==="
proot-distro install ubuntu || true

echo "=== [3/4] Siapkan Chromium & Node.js di dalam Ubuntu proot ==="
proot-distro login ubuntu -- bash -c '
  apt-get update -y
  apt-get install -y nodejs npm chromium fonts-liberation libnss3 libatk-bridge2.0-0 libgbm1
  mkdir -p ~/gpay-closer
  cd ~/gpay-closer
  npm init -y >/dev/null 2>&1 || true
  npm install playwright-core
'

echo "=== Selesai! ==="
echo "Salin file bot.mjs dan accounts.json ke folder Ubuntu ~/gpay-closer lalu jalankan:"
echo "proot-distro login ubuntu -- bash -c 'cd ~/gpay-closer && node bot.mjs'"
`;
  }

  return `#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=== [1/4] Update paket Termux & aktifkan TUR Repo ==="
pkg update -y && pkg upgrade -y
pkg install -y tur-repo nodejs-lts

echo "=== [2/4] Pasang Chromium native Termux ==="
pkg install -y chromium${config.browserMode === 'headed' ? ' x11-repo termux-x11-nightly' : ''}

echo "=== [3/4] Cek lokasi binary Chromium ==="
which chromium-browser || which chromium || echo "Peringatan: Chromium belum ditemukan di PATH"

echo "=== [4/4] Buat folder project & install playwright-core ==="
mkdir -p ~/gpay-closer
cd ~/gpay-closer
npm init -y >/dev/null 2>&1 || true
npm install playwright-core

echo "=== Instalasi Termux Selesai! ==="
echo "Simpan bot.mjs dan accounts.json ke ~/gpay-closer, lalu jalankan:"
echo "cd ~/gpay-closer && node bot.mjs"
`;
}

export function generateBotMjs(config: BotConfig): string {
  const isHeadless = config.browserMode === 'headless';
  const locale = config.language === 'en' ? 'en-US' : 'id-ID';
  const delay = config.stepDelayMs;
  const maxSkip = config.maxSkipAttempts;
  const dryRun = config.dryRun;

  return `/**
 * Google Payments Profile Auto-Closer untuk Termux (Playwright Core)
 * Menjalankan 12 langkah otomatis + konverter Base32 Secret -> 6-digit TOTP.
 *
 * Jalankan: node bot.mjs
 * Opsional override path Chromium: CHROMIUM_PATH=/path/to/chromium node bot.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright-core';

const SETTINGS_URL = 'https://payments.google.com/gp/w/u/0/home/settings';
const HEADLESS = ${isHeadless};
const DRY_RUN = ${dryRun};
const STEP_DELAY_MS = ${delay};
const MAX_SKIP_ATTEMPTS = ${maxSkip};
const BROWSER_LOCALE = '${locale}';

// ============================================================================
// KONVERTER BASE32 SECRET KEY -> 6-DIGIT GOOGLE AUTHENTICATOR TOTP (RFC 6238)
// ============================================================================
function base32ToBuffer(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = String(base32).toUpperCase().replace(/[\\s=-]+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) {
      throw new Error(\`Karakter Base32 tidak valid: "\${char}"\`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, period = 30, digits = 6) {
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const remaining = period - (epoch % period);
  const counter = Math.floor(epoch / period);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return {
    otp: String(codeInt % 10 ** digits).padStart(digits, '0'),
    remaining,
  };
}

// ============================================================================
// DETEKSI CHROMIUM TERMUX / PROOT-DISTRO
// ============================================================================
function resolveChromiumExecutable() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/data/data/com.termux/files/usr/bin/chromium-browser',
    '/data/data/com.termux/files/usr/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'Binary Chromium tidak ditemukan! Jalankan setup-termux.sh atau set CHROMIUM_PATH.'
  );
}

// ============================================================================
// HELPER PENCARIAN ELEMENT DI PAGE UTAMA & SEMUA IFRAME GOOGLE PAYMENTS
// ============================================================================
async function findVisibleLocatorInAllFrames(page, locatorFactory) {
  const scopes = [page, ...page.frames()];
  for (const scope of scopes) {
    try {
      const loc = locatorFactory(scope).first();
      if ((await loc.count()) > 0 && (await loc.isVisible())) {
        return { scope, locator: loc };
      }
    } catch {
      // Abaikan frame yang sedang navigasi
    }
  }
  return null;
}

async function scrollAllFramesToBottom(page) {
  const scopes = [page, ...page.frames()];
  for (const scope of scopes) {
    try {
      await scope.evaluate(async () => {
        const scrollTargets = [
          document.scrollingElement,
          document.documentElement,
          document.body,
          ...Array.from(document.querySelectorAll('[role="dialog"], div')).filter(
            (el) => el.scrollHeight > el.clientHeight + 40
          ),
        ].filter(Boolean);

        for (const el of scrollTargets) {
          el.scrollTop = el.scrollHeight;
        }
        window.scrollTo(0, document.body.scrollHeight);
      });
    } catch {
      // Frame mungkin cross-origin atau tertutup
    }
  }
}

async function submitTotpChallenge(page, totpSecret) {
  // Jika Google tidak langsung menampilkan input TOTP (mis. minta Passkey/Prompt),
  // klik "Coba cara lain" / "Try another way" lalu pilih Google Authenticator.
  const totpInputSelector =
    'input[name="totpPin"], #totpPin, input[type="tel"][autocomplete="one-time-code"], input[aria-label*="code" i], input[aria-label*="kode" i]';

  let totpInput = page.locator(totpInputSelector).first();
  if (!(await totpInput.isVisible().catch(() => false))) {
    const tryAnotherBtn = page
      .locator('button:has-text("Coba cara lain"), button:has-text("Try another way")')
      .first();

    if (await tryAnotherBtn.isVisible().catch(() => false)) {
      console.log('   -> Mengklik "Coba cara lain" untuk memilih Google Authenticator...');
      await tryAnotherBtn.click();
      await page.waitForTimeout(1500);
    }

    const authOption = page
      .locator(
        'li:has-text("Authenticator"), div[role="link"]:has-text("Authenticator"), div[data-challengetype="6"], button:has-text("Authenticator")'
      )
      .first();

    if (await authOption.isVisible().catch(() => false)) {
      await authOption.click();
      await page.waitForTimeout(1500);
    }
  }

  totpInput = page.locator(totpInputSelector).first();
  await totpInput.waitFor({ state: 'visible', timeout: 20000 });

  let { otp, remaining } = generateTOTP(totpSecret);
  if (remaining <= 4) {
    console.log(\`   -> Sisa waktu OTP \${remaining}s, menunggu siklus 30 detik baru...\`);
    await page.waitForTimeout((remaining + 1) * 1000);
    otp = generateTOTP(totpSecret).otp;
  }

  console.log(\`   -> Memasukkan kode OTP 6-digit: \${otp} (berlaku \${remaining}s)\`);
  await totpInput.fill(otp);

  const nextBtn = page
    .locator('#totpNext, button:has-text("Berikutnya"), button:has-text("Next")')
    .first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
  } else {
    await totpInput.press('Enter');
  }
}

async function processAccount(account, index, total) {
  console.log(\`\\n==========================================================\`);
  console.log(\`[\${index + 1}/\${total}] Memproses akun: \${account.email}\`);
  console.log(\`==========================================================\`);

  const executablePath = resolveChromiumExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900',
    ],
  });

  const context = await browser.newContext({
    locale: BROWSER_LOCALE,
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // [LANGKAH 1 & 2] Masuk ke URL settings & tunggu redirect login
    console.log('[1-2] Membuka halaman settings Google Payments...');
    await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(STEP_DELAY_MS);

    if (page.url().includes('accounts.google.com')) {
      console.log('   -> Redirect terdeteksi ke halaman login:', page.url());

      // [LANGKAH 3] Masukkan Email
      console.log('[3] Memasukkan email...');
      const emailInput = page.locator('input[type="email"], #identifierId').first();
      await emailInput.waitFor({ state: 'visible', timeout: 25000 });
      await emailInput.fill(account.email);
      await page.locator('#identifierNext, button:has-text("Berikutnya"), button:has-text("Next")').first().click();
      await page.waitForTimeout(STEP_DELAY_MS);

      // [LANGKAH 4] Masukkan Password
      console.log('[4] Memasukkan password...');
      const pwdInput = page.locator('input[type="password"], input[name="Passwd"]').first();
      await pwdInput.waitFor({ state: 'visible', timeout: 25000 });
      await pwdInput.fill(account.password);
      await page.locator('#passwordNext, button:has-text("Berikutnya"), button:has-text("Next")').first().click();
      await page.waitForTimeout(STEP_DELAY_MS);

      // [LANGKAH 5] Masukkan OTP Google Authenticator (Base32 -> 6 digit)
      console.log('[5] Memproses verifikasi Google Authenticator (TOTP Base32)...');
      await submitTotpChallenge(page, account.totpSecret);
      await page.waitForTimeout(2500);
    }

    // [LANGKAH 6] Lewati pop-up (Tambahkan alamat, Face ID / Passkey, dll) sampai masuk Settings
    console.log('[6] Mengecek & melewati pop-up pasca login...');
    const skipRegex =
      /lain kali|not now|lewati|skip|batal|cancel|no thanks|tidak, terima kasih|nanti saja/i;

    for (let attempt = 0; attempt < MAX_SKIP_ATTEMPTS; attempt++) {
      const currentUrl = page.url();
      if (currentUrl.startsWith('https://payments.google.com')) {
        break;
      }

      const skipBtn = page
        .locator('button, a, [role="button"]')
        .filter({ hasText: skipRegex })
        .first();

      if (await skipBtn.isVisible().catch(() => false)) {
        const label = (await skipBtn.innerText().catch(() => 'Skip')).trim();
        console.log(\`   -> Melewati pop-up dengan klik: "\${label}"\`);
        await skipBtn.click();
        await page.waitForTimeout(2000);
      } else {
        await page.waitForTimeout(1500);
      }
    }

    if (!page.url().includes('/gp/w/u/0/home/settings')) {
      console.log('   -> Mengarahkan ulang ke halaman settings target...');
      await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await page.waitForTimeout(3500);

    // [LANGKAH 7] Scroll ke paling bawah & temukan "Tutup profil pembayaran"
    console.log('[7] Scroll ke paling bawah untuk mencari "Tutup profil pembayaran"...');
    const closeProfileRegex = /tutup profil pembayaran|close payments? profile/i;
    let foundCloseLink = null;

    for (let scrollTry = 0; scrollTry < 8; scrollTry++) {
      await scrollAllFramesToBottom(page);
      await page.waitForTimeout(1200);
      foundCloseLink = await findVisibleLocatorInAllFrames(page, (scope) =>
        scope.locator('a, button, [role="button"], [role="link"]').filter({ hasText: closeProfileRegex })
      );
      if (foundCloseLink) break;
    }

    if (!foundCloseLink) {
      throw new Error('Tombol "Tutup profil pembayaran" tidak ditemukan (pastikan akun memiliki profil pembayaran aktif).');
    }

    await foundCloseLink.locator.scrollIntoViewIfNeeded();
    await foundCloseLink.locator.click();
    console.log('   -> Berhasil klik "Tutup profil pembayaran".');

    // [LANGKAH 8 & 9] Redirect ke verifikasi ulang password & masukkan password
    console.log('[8-9] Menunggu halaman verifikasi ulang password...');
    const reAuthPwd = page.locator('input[type="password"], input[name="Passwd"]').first();
    await reAuthPwd.waitFor({ state: 'visible', timeout: 30000 });
    await reAuthPwd.fill(account.password);
    await page.locator('#passwordNext, button:has-text("Berikutnya"), button:has-text("Next")').first().click();
    await page.waitForTimeout(2500);

    // Tangani jika Google meminta verifikasi TOTP ulang setelah re-auth password
    if (page.url().includes('accounts.google.com') && (await page.locator('input[name="totpPin"], #totpPin').first().isVisible().catch(() => false))) {
      console.log('   -> Verifikasi TOTP tambahan terdeteksi, memasukkan OTP...');
      await submitTotpChallenge(page, account.totpSecret);
    }

    await page.waitForURL((url) => url.href.includes('payments.google.com'), { timeout: 45000 });
    await page.waitForTimeout(2500);

    // [LANGKAH 10] Tunggu pop-up "Akses ke layanan akan seketika berubah" & scroll ke paling bawah
    console.log('[10] Menunggu pop-up "Akses ke layanan akan seketika berubah"...');
    const warningRegex = /akses ke layanan akan seketika berubah|access to services will change|closing your payments profile/i;

    let modalFound = null;
    for (let waitTry = 0; waitTry < 15; waitTry++) {
      modalFound = await findVisibleLocatorInAllFrames(page, (scope) =>
        scope.getByText(warningRegex)
      );
      if (modalFound) break;
      await page.waitForTimeout(1000);
    }

    if (!modalFound) {
      throw new Error('Pop-up "Akses ke layanan akan seketika berubah" tidak muncul dalam batas waktu.');
    }

    console.log('   -> Pop-up terdeteksi, melakukan scroll ke paling bawah modal...');
    await scrollAllFramesToBottom(page);
    await page.waitForTimeout(1200);

    // [LANGKAH 11] Pilih alasan "Saya tidak perlu profil ini lagi"
    console.log('[11] Memilih alasan "Saya tidak perlu profil ini lagi"...');
    const reasonTextRegex = /saya tidak perlu profil ini lagi|i don['’]t need this profile anymore/i;

    // Jika opsi alasan berbentuk dropdown/select, buka terlebih dahulu
    const dropdownTrigger = await findVisibleLocatorInAllFrames(page, (scope) =>
      scope.locator('[role="listbox"], [role="combobox"], select, button:has-text("Alasan"), button:has-text("Reason"), div[aria-haspopup="listbox"]')
    );
    if (dropdownTrigger) {
      await dropdownTrigger.locator.scrollIntoViewIfNeeded();
      await dropdownTrigger.locator.click();
      await page.waitForTimeout(1000);
    }

    const reasonOption = await findVisibleLocatorInAllFrames(page, (scope) =>
      scope
        .locator('[role="option"], [role="menuitem"], [role="radio"], label, div, span')
        .filter({ hasText: reasonTextRegex })
    );

    if (!reasonOption) {
      throw new Error('Opsi alasan "Saya tidak perlu profil ini lagi" tidak ditemukan.');
    }

    await reasonOption.locator.scrollIntoViewIfNeeded();
    await reasonOption.locator.click();
    await page.waitForTimeout(STEP_DELAY_MS);

    // [LANGKAH 12] Klik tombol final "Tutup profil pembayaran"
    console.log('[12] Memproses klik tombol akhir "Tutup profil pembayaran"...');
    await scrollAllFramesToBottom(page);

    const finalSubmitBtn = await findVisibleLocatorInAllFrames(page, (scope) =>
      scope.locator('button, [role="button"]').filter({ hasText: closeProfileRegex })
    );

    if (!finalSubmitBtn) {
      throw new Error('Tombol final "Tutup profil pembayaran" tidak ditemukan.');
    }

    if (DRY_RUN) {
      console.log('   -> [DRY_RUN AKTIF] Berhenti sebelum klik final. Semua langkah sebelumnya sukses!');
    } else {
      await finalSubmitBtn.locator.scrollIntoViewIfNeeded();
      await finalSubmitBtn.locator.click();
      await page.waitForTimeout(4000);
      console.log(\`[SELESAI] Profil pembayaran untuk \${account.email} berhasil ditutup!\`);
    }
  } catch (err) {
    console.error(\`[GAGAL] Error pada akun \${account.email}:\`, err.message);
    await page.screenshot({ path: \`error-\${index + 1}.png\`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

async function main() {
  const accountsPath = path.resolve(process.cwd(), 'accounts.json');
  if (!fs.existsSync(accountsPath)) {
    throw new Error('File accounts.json tidak ditemukan di direktori saat ini.');
  }

  const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('accounts.json harus berisi minimal 1 objek akun.');
  }

  for (let i = 0; i < accounts.length; i++) {
    await processAccount(accounts[i], i, accounts.length);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
`;
}

export function generateBotPy(config: BotConfig): string {
  const isHeadless = config.browserMode === 'headless' ? 'True' : 'False';
  const dryRun = config.dryRun ? 'True' : 'False';
  const locale = config.language === 'en' ? 'en-US' : 'id-ID';
  const delaySec = (config.stepDelayMs / 1000).toFixed(1);

  return `"""
Alternatif Python Playwright untuk Termux / proot-distro Ubuntu.
Dependensi: pip install playwright pyotp
"""

import json
import os
import re
import time
import pyotp
from playwright.sync_api import sync_playwright

SETTINGS_URL = "https://payments.google.com/gp/w/u/0/home/settings"
HEADLESS = ${isHeadless}
DRY_RUN = ${dryRun}
STEP_DELAY = ${delaySec}


def resolve_chromium():
    candidates = [
        os.environ.get("CHROMIUM_PATH"),
        "/data/data/com.termux/files/usr/bin/chromium-browser",
        "/data/data/com.termux/files/usr/bin/chromium",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return path
    raise FileNotFoundError("Chromium tidak ditemukan. Install via pkg/apt atau set CHROMIUM_PATH.")


def get_valid_totp(secret: str) -> str:
    cleaned = re.sub(r"[\\s=-]+", "", secret.upper())
    totp = pyotp.TOTP(cleaned)
    remaining = 30 - (int(time.time()) % 30)
    if remaining <= 4:
        print(f"   -> Sisa waktu OTP {remaining}s, menunggu siklus berikutnya...")
        time.sleep(remaining + 1)
    return totp.now()


def find_in_all_frames(page, locator_fn):
    for scope in [page, *page.frames]:
        try:
            loc = locator_fn(scope).first
            if loc.count() > 0 and loc.is_visible():
                return loc
        except Exception:
            pass
    return None


def scroll_all_frames(page):
    for scope in [page, *page.frames]:
        try:
            scope.evaluate("""() => {
                window.scrollTo(0, document.body.scrollHeight);
                document.querySelectorAll('[role="dialog"], div').forEach(el => {
                    if (el.scrollHeight > el.clientHeight + 40) el.scrollTop = el.scrollHeight;
                });
            }""")
        except Exception:
            pass


def run_account(acc):
    print(f"\\n=== Memproses {acc['email']} ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=resolve_chromium(),
            headless=HEADLESS,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        context = browser.new_context(locale="${locale}", viewport={"width": 1280, "height": 900})
        page = context.new_page()

        try:
            # 1 & 2. Buka URL Settings -> Redirect ke Login
            page.goto(SETTINGS_URL, wait_until="domcontentloaded", timeout=60000)
            time.sleep(STEP_DELAY)

            if "accounts.google.com" in page.url:
                # 3. Email
                page.locator('input[type="email"], #identifierId').first.fill(acc["email"])
                page.locator('#identifierNext, button:has-text("Berikutnya"), button:has-text("Next")').first.click()
                time.sleep(STEP_DELAY)

                # 4. Password
                pwd = page.locator('input[type="password"], input[name="Passwd"]').first
                pwd.wait_for(state="visible", timeout=25000)
                pwd.fill(acc["password"])
                page.locator('#passwordNext, button:has-text("Berikutnya"), button:has-text("Next")').first.click()
                time.sleep(STEP_DELAY)

                # 5. Google Authenticator OTP
                totp_sel = 'input[name="totpPin"], #totpPin, input[type="tel"][autocomplete="one-time-code"]'
                if not page.locator(totp_sel).first.is_visible():
                    try_other = page.locator('button:has-text("Coba cara lain"), button:has-text("Try another way")').first
                    if try_other.is_visible():
                        try_other.click()
                        time.sleep(1.5)
                    auth_opt = page.locator('li:has-text("Authenticator"), button:has-text("Authenticator")').first
                    if auth_opt.is_visible():
                        auth_opt.click()
                        time.sleep(1.5)

                totp_input = page.locator(totp_sel).first
                totp_input.wait_for(state="visible", timeout=20000)
                otp = get_valid_totp(acc["totpSecret"])
                print(f"   -> Memasukkan OTP 6-digit: {otp}")
                totp_input.fill(otp)
                page.locator('#totpNext, button:has-text("Berikutnya"), button:has-text("Next")').first.click()
                time.sleep(2.5)

            # 6. Skip pop-up (Alamat, Face ID, dll)
            skip_re = re.compile(r"lain kali|not now|lewati|skip|batal|cancel", re.I)
            for _ in range(${config.maxSkipAttempts}):
                if page.url.startswith("https://payments.google.com"):
                    break
                btn = page.locator("button, a, [role='button']").filter(has_text=skip_re).first
                if btn.is_visible():
                    btn.click()
                    time.sleep(2)
                else:
                    time.sleep(1.5)

            if "/gp/w/u/0/home/settings" not in page.url:
                page.goto(SETTINGS_URL, wait_until="domcontentloaded", timeout=60000)
            time.sleep(3)

            # 7. Scroll ke bawah & klik "Tutup profil pembayaran"
            close_re = re.compile(r"tutup profil pembayaran|close payments? profile", re.I)
            close_btn = None
            for _ in range(8):
                scroll_all_frames(page)
                time.sleep(1.2)
                close_btn = find_in_all_frames(
                    page, lambda s: s.locator("a, button, [role='button'], [role='link']").filter(has_text=close_re)
                )
                if close_btn:
                    break
            if not close_btn:
                raise RuntimeError("Tombol Tutup profil pembayaran tidak ditemukan.")
            close_btn.scroll_into_view_if_needed()
            close_btn.click()

            # 8 & 9. Re-auth password
            re_pwd = page.locator('input[type="password"], input[name="Passwd"]').first
            re_pwd.wait_for(state="visible", timeout=30000)
            re_pwd.fill(acc["password"])
            page.locator('#passwordNext, button:has-text("Berikutnya"), button:has-text("Next")').first.click()

            page.wait_for_url("**/payments.google.com/**", timeout=45000)
            time.sleep(2.5)

            # 10. Tunggu pop-up "Akses ke layanan akan seketika berubah" & scroll ke bawah
            warn_re = re.compile(r"akses ke layanan akan seketika berubah|access to services will change", re.I)
            for _ in range(15):
                if find_in_all_frames(page, lambda s: s.get_by_text(warn_re)):
                    break
                time.sleep(1)
            scroll_all_frames(page)
            time.sleep(1)

            # 11. Pilih alasan "Saya tidak perlu profil ini lagi"
            trigger = find_in_all_frames(
                page, lambda s: s.locator('[role="listbox"], [role="combobox"], select, button:has-text("Alasan")')
            )
            if trigger:
                trigger.click()
                time.sleep(1)

            reason_re = re.compile(r"saya tidak perlu profil ini lagi|i don['’]t need this profile anymore", re.I)
            reason = find_in_all_frames(
                page, lambda s: s.locator('[role="option"], [role="radio"], label, div').filter(has_text=reason_re)
            )
            if not reason:
                raise RuntimeError("Alasan 'Saya tidak perlu profil ini lagi' tidak ditemukan.")
            reason.click()
            time.sleep(STEP_DELAY)

            # 12. Klik tombol final "Tutup profil pembayaran"
            scroll_all_frames(page)
            final_btn = find_in_all_frames(page, lambda s: s.locator("button, [role='button']").filter(has_text=close_re))
            if not final_btn:
                raise RuntimeError("Tombol final Tutup profil pembayaran tidak ditemukan.")

            if DRY_RUN:
                print("   -> [DRY_RUN] Berhenti sebelum klik final.")
            else:
                final_btn.click()
                time.sleep(4)
                print(f"[SELESAI] Profil pembayaran {acc['email']} berhasil ditutup.")
        finally:
            browser.close()


if __name__ == "__main__":
    with open("accounts.json", "r", encoding="utf-8") as f:
        for account in json.load(f):
            run_account(account)
`;
}

export function generateOneLineBundleCommand(config: BotConfig): string {
  const botMjs = generateBotMjs(config);
  const accountsJson = generateAccountsJson(config);
  const setup = generateSetupTermuxScript(config);

  return `${setup}
cat << 'EOF_ACCOUNTS' > ~/gpay-closer/accounts.json
${accountsJson}
EOF_ACCOUNTS

cat << 'EOF_BOT' > ~/gpay-closer/bot.mjs
${botMjs}
EOF_BOT

echo "Semua file (setup, accounts.json, bot.mjs) siap di ~/gpay-closer!"
echo "Jalankan: cd ~/gpay-closer && node bot.mjs"
`;
}
