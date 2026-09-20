# Coiled Tubing Fatigue & Wellbore Forces Modeling Suite

> **Aplikasi Rekayasa Komprehensif untuk Analisis Fatigue Life Coiled Tubing, Multistage String Management, Batas Buckling Kritis Sumur, dan Visualisasi Lintasan 3D.**  
> Mendukung deployment **Web App** dan packaging **Standalone Windows Executable (`.exe`) / Installer (NSIS)** menggunakan **Electron.js**.

---

## 📑 Daftar Isi

- [Gambaran Umum (Overview)](#-gambaran-umum-overview)
- [Fitur Utama Rekayasa](#-fitur-utama-rekayasa)
- [Konfigurasi Installer Electron.js](#-konfigurasi-installer-electronjs)
- [Cara Build Installer .EXE untuk Windows](#-cara-build-installer-exe-untuk-windows)
- [Cara Menjalankan dalam Mode Development](#-cara-menjalankan-dalam-mode-development)
- [Struktur File Repositori](#-struktur-file-repositori)
- [Dasar Teori & Formulasi Rekayasa](#-dasar-teori--formulasi-rekayasa)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Lisensi](#-lisensi)

---

## 🌟 Gambaran Umum (Overview)

**Coiled Tubing Engineering Suite** adalah perangkat lunak analisis teknik perminyakan (*petroleum engineering software*) yang dirancang khusus untuk memodelkan kelelahan material (*fatigue damage*) pipa lentur (CT), mengevaluasi batas-batas kritis mekanika sumur (gaya normal, berat gantung/hookload, batas sinusoidal & helical buckling), serta menyimulasikan konfigurasi multistage string bergradasi.

Aplikasi ini dapat dijalankan langsung di peramban web (*browser*) maupun dikompilasi menjadi aplikasi desktop mandiri (**Windows .EXE**) yang **100% offline**, memungkinkan insinyur lapangan menggunakannya di lokasi rig (*rig-site*) tanpa memerlukan koneksi internet.

---

## 🛠️ Fitur Utama Rekayasa

1. **Coiled Tubing Fatigue & Life Cycle Tracking**
   - Perhitungan akumulasi kerusakan berbasis hukum **Palmgren-Miner** ($\sum \frac{n_i}{N_i} \le 1.0$).
   - Regangan plastis siklis (*cyclic plastic bending*) melewati radius reel dan guide gooseneck.
   - Koreksi pengaruh tekanan internal kerja sumur terhadap percepatan fatigue.
   - Pemantauan batas ovalitas (*ovality/ballooning limits*) sesuai standar API.

2. **Multistage Tapered String Manager**
   - Konfigurasi variasi ketebalan dinding (*wall thickness taper schedule*).
   - Analisis sambungan strip (*strip transitions*), kapasitas gulungan (*reel capacity*), dan bobot total string di udara maupun di dalam fluida sumur (faktor daya apung / *buoyancy factor*).

3. **Wellbore Forces & Buckling Dynamics**
   - Batas sinusoidal buckling model **Dawson-Paslay** ($F_{\text{crit}}$).
   - Batas helical buckling model **Wu & Juvkam-Wold** ($F_{\text{hel}}$).
   - Slider dinamis koefisien gesek pipa-lubang sumur (*friction factor* $\mu = 0.10 - 0.40$) dilengkapi indikator status tren ($\downarrow$ Rendah / $\uparrow$ Tinggi).
   - Kurva gaya hookload: *Slack-off (RIH)*, *Pick-up (POOH)*, dan *Neutral String Weight* dengan transisi animasi *smooth interpolation* real-time.

4. **Stress Distribution & Triaxial Yield Analysis**
   - Analisis tegangan triaksial ekuivalen **von Mises** ($\sigma_{\text{vM}}$).
   - Evaluasi batas aman *Burst Pressure*, *Collapse Resistance*, dan kekuatan tarik aksial (*Axial Tension Yield*).

5. **Visualisasi Lintasan Sumur 3D Interaktif (WebGL)**
   - Render 3D lintasan sumur menggunakan **Three.js**.
   - Pelacakan posisi kedalaman *Measured Depth* (MD), *True Vertical Depth* (TVD), *Dogleg Severity* (DLS), serta posisi rakitan alat bawah permukaan (BHA).

6. **Sensitivity & What-If Matrix**
   - Matriks uji parametrik terhadap variasi tekanan sirkulasi, diameter gooseneck/reel, ketebalan dinding, dan koefisien friksi.

7. **Laporan Pekerjaan & Ekspor Data**
   - Pembuatan laporan teknik formal siap cetak / PDF (*Engineering Job Sheet*).
   - Ekspor data mentah dan ringkasan ke format **CSV** dan **Excel (.xlsx)**.

---

## ⚡ Konfigurasi Installer Electron.js

Aplikasi ini telah dikonfigurasi menggunakan **Electron** dan **electron-builder** untuk menghasilkan berkas instalasi Windows.

### 1. Berkas Konfigurasi Utama: `electron-builder.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json",
  "appId": "com.coiledtubing.suite",
  "productName": "Coiled Tubing Engineering Suite",
  "copyright": "Copyright © 2026 Coiled Tubing Engineering",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "electron/**/*",
    "package.json"
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      },
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "requestedExecutionLevel": "asInvoker"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Coiled Tubing Engineering Suite",
    "uninstallDisplayName": "Coiled Tubing Engineering Suite",
    "artifactName": "${productName}-Setup-${version}.${ext}",
    "runAfterFinish": true,
    "deleteAppDataOnUninstall": false,
    "perMachine": false
  },
  "portable": {
    "artifactName": "${productName}-v${version}-Portable.exe"
  }
}
```

### 2. Fitur Konfigurasi NSIS Installer:
- **`oneClick: false`**: Membuka antarmuka *Setup Wizard* standar Windows, bukan instalasi tersembunyi.
- **`allowToChangeInstallationDirectory: true`**: Memungkinkan pengguna memilih direktori tujuan instalasi (misalnya di `C:\Program Files\` atau drive lain).
- **`createDesktopShortcut: true`**: Otomatis membuat pintasan ikon di Desktop Windows.
- **`createStartMenuShortcut: true`**: Otomatis menambahkan aplikasi ke daftar menu Start Windows.
- **`perMachine: false`**: Dapat dipasang untuk *Current User* tanpa memerlukan akses Administrator (UAC).
- **`portable` Target**: Menghasilkan file `.exe` tunggal (*standalone*) yang dapat langsung dijalankan dari USB flashdisk tanpa proses instalasi.

---

## 🚀 Cara Build Installer .EXE untuk Windows

### Prasyarat
- Pastikan komputer Anda telah terpasang **Node.js** (versi 18, 20, atau 22 LTS). Unduh dari [nodejs.org](https://nodejs.org).
- Sistem Operasi: **Windows 10 / 11 (64-bit)**.

---

### Metode 1: Menggunakan Skrip Otomatis (1-Click Builder)

1. Unduh atau ekstrak repositori ini ke komputer Windows Anda.
2. Klik ganda pada berkas **`build-windows-exe.bat`**.
3. Skrip akan otomatis:
   - Memeriksa versi Node.js
   - Memasang dependensi (`npm install`)
   - Membangun aset produksi Vite (`npm run build`)
   - Memaketkan installer dengan `electron-builder`
4. Berkas keluaran akan otomatis terbuka di folder **`.\release\`**.

---

### Metode 2: Melalui Terminal (Command Prompt / PowerShell)

Buka terminal di direktori proyek, lalu jalankan perintah berikut:

```bash
# 1. Pasang dependensi proyek
npm install

# 2. Build Installer Setup (NSIS Wizard .exe)
npm run build:installer

# ATAU: Build versi Portable (.exe tanpa instalasi)
npm run build:portable

# ATAU: Build Keduanya sekaligus (Setup Installer + Portable)
npm run build:exe
```

### Berkas Hasil Output di Folder `release/`:
- **`Coiled Tubing Engineering Suite-Setup-1.0.0.exe`**: Berkas installer resmi Windows dengan wizard instalasi dan uninstaller.
- **`Coiled Tubing Engineering Suite-v1.0.0-Portable.exe`**: Berkas eksekutabel mandiri yang bisa dijalankan langsung.

---

## 💻 Cara Menjalankan dalam Mode Development

### 1. Menjalankan Mode Web (Browser):
```bash
npm run dev
```
Buka browser pada alamat `http://localhost:3000`.

### 2. Menjalankan Mode Desktop (Electron Window):
```bash
# Opsi A: Jalankan skrip batch
run-desktop-dev.bat

# Opsi B: Melalui terminal
npm run electron:dev
```
Aplikasi akan terbuka langsung di dalam jendela desktop native Electron dengan menu File, View, Zoom, dan Developer Tools.

---

## 📁 Struktur File Repositori

```text
├── electron/
│   ├── main.cjs               # Main process Electron (jendela native, menu aplikasi, sandbox)
│   └── preload.cjs            # Preload script (contextBridge aman tanpa nodeIntegration terbuka)
├── src/
│   ├── components/            # Komponen antarmuka React
│   │   ├── CriticalBucklingChart.tsx       # Grafik batas buckling Dawson-Paslay & Wu
│   │   ├── WellboreForcesHookloadChart.tsx  # Kurva gaya sumur & slack-off/pick-up
│   │   ├── Wellbore3DVisualizer.tsx        # Visualisasi lintasan 3D WebGL (Three.js)
│   │   ├── DesktopExeModal.tsx             # Modal dialog panduan & unduh build batch
│   │   ├── Header.tsx                      # Header navigasi & aksi ekspor
│   │   └── ...                             # Modul analisis sensitivitas, fatigue, dsb.
│   ├── utils/
│   │   ├── engineeringCalculations.ts      # Formula mekanika pipa & kalkulasi batas
│   │   ├── fatigueCalculations.ts          # Algoritma Palmgren-Miner fatigue damage
│   │   └── csvExport.ts                    # Utility pembuatan data CSV & Excel
│   ├── App.tsx                # Komponen root aplikasi
│   ├── main.tsx               # Entry point React
│   └── types.ts               # Definisi tipe data TypeScript
├── electron-builder.json      # Konfigurasi pembuatan installer Windows NSIS & Portable
├── build-windows-exe.bat      # Skrip 1-klik build installer di Windows
├── run-desktop-dev.bat        # Skrip 1-klik jalankan mode Electron dev di Windows
├── vite.config.ts             # Konfigurasi bundler Vite (base: './' untuk file:// protocol)
├── package.json               # Dependensi proyek & script build
└── README.md                  # Dokumentasi proyek
```

---

## 📐 Dasar Teori & Formulasi Rekayasa

- **Akumulasi Fatigue (Palmgren-Miner Rule)**:
  $$D = \sum_{i=1}^{k} \frac{n_i}{N_i}$$
  *Di mana $n_i$ adalah jumlah siklus kerja aktual, dan $N_i$ adalah total siklus hingga terjadi kegagalan material pada level regangan terkait.*

- **Batas Sinusoidal Buckling (Dawson & Paslay, 1984)**:
  $$F_{\text{crit}} = 2 \sqrt{\frac{E \cdot I \cdot w \cdot \sin(\theta)}{r}}$$
  *Di mana $E$ adalah modulus elastisitas, $I$ momen inersia penampang, $w$ berat efektif pipa per satuan panjang, $\theta$ inklinasi sumur, dan $r$ jarak radial celah pipa terhadap lubang sumur.*

- **Batas Helical Buckling (Wu & Juvkam-Wold, 1995)**:
  $$F_{\text{hel}} = 2 \sqrt{2} \sqrt{\frac{E \cdot I \cdot w \cdot \sin(\theta)}{r}} \approx 1.414 \cdot F_{\text{crit}}$$

- **Tegangan Triaksial von Mises**:
  $$\sigma_{\text{vM}} = \sqrt{\frac{1}{2} \left[ (\sigma_a - \sigma_r)^2 + (\sigma_r - \sigma_\theta)^2 + (\sigma_\theta - \sigma_a)^2 \right]}$$

---

## 💻 Persyaratan Sistem

- **Sistem Operasi**: Windows 10 / Windows 11 (64-bit)
- **Prosesor**: Dual Core 2.0 GHz atau lebih tinggi
- **RAM**: Minimal 4 GB (Disarankan 8 GB)
- **Kartu Grafis**: Mendukung WebGL 2.0 / OpenGL (untuk visualisasi 3D lintasan sumur)
- **Koneksi Internet**: **Tidak diperlukan** untuk versi desktop (100% offline).

---

## 📄 Lisensi

Copyright © 2026 Coiled Tubing Engineering. Seluruh hak cipta dilindungi undang-undang.  
Didesain untuk keperluan pemodelan teknik perminyakan dan operasi lapangan pipa lentur.
