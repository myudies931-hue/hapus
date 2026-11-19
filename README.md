# Termux Playwright Payment Closer

Aplikasi web generator skrip Playwright (**`bot.mjs`**, **`bot.py`**, **`accounts.json`**, dan **`setup-termux.sh`**) yang dirancang khusus untuk berjalan di **Termux (Android ARM64)** guna mengotomatiskan penutupan **Profil Pembayaran Google** (*Google Payments Profile*) sekaligus membersihkan anggota **Google Family** hingga tuntas.

---

## Fitur Utama

- **Kompatibel Termux Native & Proot Ubuntu**
  - Menyertakan patch `process.platform` (`android` → `linux`) sebelum `await import('playwright-core')` sehingga berjalan langsung di Node.js Termux tanpa error `Unsupported platform: android`.
  - Mendukung peluncuran Chromium native dari `tur-repo` maupun `proot-distro ubuntu`.
- **Dua Mode Sumber Akun (`accounts.json`)**
  1. **Link Website (`url`)**: Bot membuka link panel akun di Tab 1, mengambil email (terisolasi dari teks tombol `Salin`), menyalin password asli yang disensor lewat tombol `Copy`/`Salin` menggunakan hook clipboard headless, serta membaca kode OTP live 6-digit.
  2. **Manual (`email`, `password`, `totpSecret`)**: Mengonversi Base32 Secret Key (atau URI `otpauth://`) menjadi kode TOTP 6-digit (RFC 6238 HMAC-SHA1) dengan sinkronisasi jam otomatis dari header HTTP `Date` server Google.
- **Alur Otomatisasi 13 Langkah Lengkap**
  - Melewati pop-up pasca login (*Set a home address*, *Passkey*, dll.).
  - Mendeteksi otomatis bila akun **belum memiliki profil pembayaran** (*"Tambahkan metode pembayaran"* / *"Add a payment method"*).
  - Menangani jendela pop-up verifikasi ulang (`--disable-popup-blocking`) maupun redirect tab yang sama saat menutup profil pembayaran.
  - Mengosongkan grup **Google Family** (`myaccount.google.com/family/details`) dengan menghapus seluruh akun berlabel **`Anggota` / `Member`** (menggunakan Smart Re-Auth adaptif untuk Password dan/atau Google Authenticator) hingga hanya tersisa 1 **Pengelola akun keluarga**, atau melapor jika Family sudah kosong.
- **Sensor Log Kredensial**
  - Seluruh URL, email, password, dan secret key yang diambil dari `accounts.json` disensor otomatis di log terminal (`akun #N yang diisi di accounts.json` / `(disensor)`).
- **Screenshot Diagnostik 12 Angka Acak**
  - Saat terjadi error, bot mengambil screenshot layar terakhir dengan nama 12 digit angka acak (contoh: `482910384712.png`) di folder kerja dan menyalinnya ke `/storage/emulated/0/Download/` agar mudah dibuka di Android.

---

## Alur Kerja Bot (13 Tahap)

1. Buka `https://payments.google.com/gp/w/u/0/home/settings`.
2. Deteksi redirect login ke `accounts.google.com`.
3. Masukkan email & deteksi dini bila email ditolak.
4. Masukkan password (mengabaikan input tersembunyi `hiddenPassword`).
5. Verifikasi 2 Langkah menggunakan OTP 6-digit Google Authenticator.
6. Lewati pop-up pasca login (`Skip`, `Lewati`, `Lain kali`, `Not now`, termasuk *Set a home address*).
7. Periksa status profil pembayaran: jika kosong (*Tambahkan metode pembayaran*), langsung lanjut ke Langkah 13; jika aktif, scroll ke paling bawah (termasuk `iframe`) dan klik **Tutup profil pembayaran / Close payments profile**.
8. Deteksi jendela pop-up baru atau redirect verifikasi ulang password.
9. Masukkan password ulang (dan TOTP bila diminta).
10. Tunggu dialog peringatan *Akses ke layanan akan seketika berubah* lalu scroll ke bawah.
11. Pilih alasan penutupan **Saya tidak perlu profil ini lagi** (*I don't need this profile anymore*).
12. Klik tombol final **Tutup profil pembayaran** (atau berhenti sebelum klik jika mode `DRY_RUN` diaktifkan).
13. Buka `https://myaccount.google.com/family/details`:
    - Jika muncul *"Your family on Google / Get started"*, bot melapor Family sudah kosong.
    - Jika ada grup keluarga, bot menghapus seluruh member berlabel **Anggota / Member** satu per satu dengan Smart Re-Auth (Password / Authenticator) hingga tersisa 1 orang (**Pengelola akun keluarga**).

---

## Cara Pakai di Termux (Android)

### 1. Instalasi Paket Termux Native

Jalankan perintah berikut di aplikasi Termux:

```bash
pkg update -y && pkg upgrade -y
pkg install -y tur-repo nodejs-lts chromium
termux-setup-storage

mkdir -p ~/gpay-closer
cd ~/gpay-closer
npm init -y
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright-core
```

> Catatan: `termux-setup-storage` diperlukan sekali agar bot dapat menyalin screenshot error ke folder `/storage/emulated/0/Download/`.

### 2. Siapkan File `accounts.json` dan `bot.mjs`

Buat skrip melalui antarmuka web **Termux Playwright Studio**, lalu salin `accounts.json` dan `bot.mjs` (atau unduh bundel `install-gpay-bot.sh`) ke folder `~/gpay-closer/`.

Contoh `accounts.json` (Mode Link Website):

```json
[
  {
    "url": "https://akun.impura.id/contoh-link-1"
  },
  {
    "url": "https://akun.impura.id/contoh-link-2"
  }
]
```

Contoh `accounts.json` (Mode Manual):

```json
[
  {
    "email": "email-anda@gmail.com",
    "password": "PASSWORD_AKUN_ANDA",
    "totpSecret": "JBSWY3DPEHPK3PXP"
  }
]
```

### 3. Jalankan Bot

```bash
cd ~/gpay-closer
node bot.mjs
```

Jika binary Chromium berada di lokasi custom, Anda dapat menentukan path-nya secara manual:

```bash
CHROMIUM_PATH=/data/data/com.termux/files/usr/bin/chromium-browser node bot.mjs
```

---

## Menjalankan Web Studio Secara Lokal

Aplikasi web generator dibangun dengan React, TypeScript, Vite, dan Tailwind CSS.

```bash
# Install dependensi
npm install

# Jalankan server development (port 3000)
npm run dev

# Cek tipe TypeScript
npm run lint

# Build produksi
npm run build
```

---

## Struktur Proyek

```text
├── index.html                  # Entry HTML & konfigurasi font
├── metadata.json               # Metadata aplikasi
├── package.json                # Dependensi & skrip build
├── src/
│   ├── App.tsx                 # Tata letak utama & konfigurasi default
│   ├── types.ts                # Definisi tipe TypeScript
│   ├── data/
│   │   └── workflowSteps.ts    # Dokumentasi terstruktur 13 langkah otomasi
│   ├── utils/
│   │   ├── totp.ts             # Decoder Base32 & generator TOTP 6-digit (Web Crypto)
│   │   └── scriptGenerator.ts  # Generator bot.mjs, bot.py, accounts.json, & setup-termux.sh
│   └── components/
│       ├── TopBar.tsx          # Navigasi atas & tombol unduh paket Termux
│       ├── ConfigPanel.tsx     # Pengaturan runtime Termux, mode uji, & daftar akun
│       ├── CodeViewer.tsx      # Pratinjau kode hasil generate dengan salin & unduh
│       ├── TotpTester.tsx      # Uji konversi Base32 Secret Key -> 6-digit OTP live
│       ├── WorkflowInspector.tsx # Inspektor interaktif selector DOM 13 langkah
│       └── TermuxGuide.tsx     # Panduan instalasi Termux Native & Proot Ubuntu
└── README.md
```

---

## Peringatan Penggunaan

- Gunakan hanya untuk akun yang Anda miliki atau kelola secara sah.
- Penutupan profil pembayaran Google bersifat permanen setelah konfirmasi akhir dijalankan (`DRY_RUN = false`). Pastikan tidak ada langganan aktif atau saldo tertunda sebelum menjalankan mode penuh.
- Jangan mengunggah file `accounts.json` asli Anda ke repositori publik GitHub—tambahkan `accounts.json` ke `.gitignore` sebelum melakukan commit.
