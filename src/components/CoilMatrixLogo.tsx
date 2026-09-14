import React, { useState } from 'react';

interface CoilMatrixLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
  onClick?: () => void;
}

export const CoilMatrixLogo: React.FC<CoilMatrixLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  className = '',
  theme = 'dark',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const dimMap = {
    sm: { box: 'w-8 h-8', icon: 32, title: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10', icon: 40, title: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14', icon: 56, title: 'text-lg', sub: 'text-xs' },
    xl: { box: 'w-20 h-20', icon: 80, title: 'text-2xl', sub: 'text-sm' },
  };

  const currentDim = dimMap[size];

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Emblem Box */}
      <div
        className={`relative ${currentDim.box} rounded-xl overflow-hidden shadow-lg shadow-cyan-950/40 border border-slate-700/80 bg-slate-900 flex items-center justify-center shrink-0 group`}
      >
        {!imageError ? (
          <img
            src="/logo.jpg"
            alt="Coil Matrix Pro Logo"
            className="w-full h-full object-cover object-center transform transition-transform group-hover:scale-105 duration-200"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          /* High-precision SVG Vector Fallback */
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="cOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="50%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="cOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0c4a6e" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>

            {/* Base Tile */}
            <rect width="100" height="100" rx="20" fill="url(#bgGrad)" />

            {/* Outer Orange Accent Ring Arc */}
            <path
              d="M 50 15 A 35 35 0 1 0 75 75"
              stroke="url(#cOrangeGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />

            {/* Bold Stylized "C" Arc */}
            <path
              d="M 50 12 A 38 38 0 1 0 80 68"
              stroke="url(#cOuterGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />

            {/* Diagonal Arrow Stem */}
            <path
              d="M 32 68 L 65 35"
              stroke="url(#arrowGrad)"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Diagonal Arrow Head */}
            <polygon
              points="65,22 80,37 60,42"
              fill="#ea580c"
            />
            <polygon
              points="63,26 76,38 60,40"
              fill="#38bdf8"
            />

            {/* Circuit traces & dots inside arrow */}
            <line x1="36" y1="64" x2="48" y2="52" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="48" cy="52" r="2" fill="#38bdf8" />
            <line x1="48" y1="52" x2="56" y2="52" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="56" cy="52" r="2" fill="#f97316" />
            <line x1="42" y1="58" x2="52" y2="48" stroke="#fb923c" strokeWidth="1.5" />
            <circle cx="52" cy="48" r="1.8" fill="#fb923c" />
            <line x1="52" y1="48" x2="60" y2="40" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="60" cy="40" r="2" fill="#38bdf8" />
          </svg>
        )}
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-tight ${currentDim.title} ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Coil
            </span>
            <span className={`font-black tracking-tight ${currentDim.title} text-orange-500`}>
              Matrix Pro
            </span>
          </div>

          {showSubtitle && (
            <p
              className={`font-medium tracking-wide mt-1 leading-tight ${currentDim.sub} ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Advanced Data Acquisition System
            </p>
          )}
        </div>
      )}
    </div>
  );
};
