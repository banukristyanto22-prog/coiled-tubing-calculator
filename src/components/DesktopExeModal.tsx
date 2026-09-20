import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Terminal,
  Monitor,
  FolderArchive,
  Cpu,
  CheckCircle2,
  HardDrive,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface DesktopExeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopExeModal: React.FC<DesktopExeModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleDownloadBatch = () => {
    const batContent = `@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo  COILED TUBING FATIGUE ^& WELLBORE FORCES SUITE
echo  Windows Standalone Executable (.EXE) Automated Builder
echo =====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js (v18, v20, or v22 LTS) from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [*] Detected Node.js version: %NODE_VER%
echo.

if not exist "node_modules\\" (
    echo [1/3] Installing application dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
) else (
    echo [1/3] node_modules exists. Skipping full install.
)

echo.
echo [2/3] Building production assets (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Vite build failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Packaging standalone Windows .exe with Electron Builder...
call npx electron-builder --win portable
if %errorlevel% neq 0 (
    echo [ERROR] Electron packaging failed.
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo  BUILD SUCCESSFUL!
echo.
echo  Your standalone Windows .exe has been created in:
echo    .\\release\\
echo =====================================================================
echo.

if exist "release\\" (
    explorer release
)

pause
`;

    const blob = new Blob([batContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-windows-exe.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Windows Standalone Executable (.EXE)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready to Package
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Package and run Coiled Tubing Engineering Suite as an offline desktop application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Quick Overview Card */}
          <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
                <Cpu className="w-4 h-4" />
                <span>Electron + Electron-Builder Preconfigured</span>
              </div>
              <p className="text-slate-400 text-xs">
                Generates a 100% self-contained Windows <code className="text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded font-mono">.exe</code> file.
                No browser or external server required; runs offline in field operations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBatch}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download build-windows-exe.bat</span>
            </button>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-cyan-400" />
              <span>How to Build Your .EXE File on Windows</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold font-mono text-[11px] flex items-center justify-center border border-cyan-500/40">
                    1
                  </span>
                  <span className="font-semibold text-white">Export Project</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Export this project via AI Studio <strong className="text-slate-200">Settings &rarr; Export to ZIP</strong> (or clone via GitHub) onto your Windows workstation.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold font-mono text-[11px] flex items-center justify-center border border-cyan-500/40">
                    2
                  </span>
                  <span className="font-semibold text-white">Run 1-Click Builder</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Extract the files and double-click <strong className="text-cyan-300 font-mono">build-windows-exe.bat</strong> (or run the terminal command below).
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[11px] flex items-center justify-center border border-emerald-500/40">
                    3
                  </span>
                  <span className="font-semibold text-white">Launch .EXE</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Find your standalone executable in the <code className="text-emerald-300 font-mono font-bold">.\release\</code> folder and launch it immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Terminal Commands Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Command-Line Options</span>
            </h3>

            <div className="space-y-2">
              {/* Command 1: Build Portable .EXE */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1 overflow-x-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[10px]"># Build standalone portable Windows .exe</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">Recommended</span>
                  </div>
                  <code className="text-cyan-300 font-mono text-xs font-semibold block">
                    npm run build:exe
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('npm run build:exe', 'build:exe')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer"
                >
                  {copiedCmd === 'build:exe' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Command 2: Build Installer (NSIS) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1 overflow-x-auto">
                  <span className="text-slate-400 font-mono text-[10px]"># Build Windows installer (.exe with desktop & start menu shortcuts)</span>
                  <code className="text-cyan-300 font-mono text-xs font-semibold block">
                    npm run build:installer
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('npm run build:installer', 'build:installer')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer"
                >
                  {copiedCmd === 'build:installer' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Command 3: Test in Desktop Window */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1 overflow-x-auto">
                  <span className="text-slate-400 font-mono text-[10px]"># Test run inside native desktop window</span>
                  <code className="text-slate-300 font-mono text-xs font-semibold block">
                    npm run electron:dev
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('npm run electron:dev', 'electron:dev')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer"
                >
                  {copiedCmd === 'electron:dev' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Features Matrix */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Desktop .EXE Build Capabilities:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Offline (rig-site field capability)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All 7 engineering modules included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WebGL 3D Wellbore & trajectory viewer</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Local PDF & Excel/CSV export capabilities</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hardware acceleration supported</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No administrative rights required for Portable .exe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            Electron v35+ &bull; Architecture: x64 Windows (.exe)
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadBatch}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get .bat Builder</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
