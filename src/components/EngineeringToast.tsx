import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { ToastItem } from '../types/toast';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  X, 
  Wrench, 
  Volume2, 
  VolumeX, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({
  toast,
  onDismiss,
  soundEnabled,
  onToggleSound,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const autoDismissMs = toast.autoDismissMs ?? 6000;
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(autoDismissMs);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const timer = setInterval(() => {
      remainingTimeRef.current -= interval;
      const pct = Math.max(0, (remainingTimeRef.current / autoDismissMs) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(timer);
        onDismiss(toast.id);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, autoDismissMs, onDismiss, toast.id]);

  const getSeverityConfig = () => {
    switch (toast.severity) {
      case 'error':
        return {
          icon: AlertOctagon,
          borderColor: 'border-rose-500/60',
          bgGradient: 'from-slate-900/98 via-rose-950/30 to-slate-900/98',
          iconColor: 'text-rose-400',
          iconBg: 'bg-rose-500/20 border-rose-500/40',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          progressBar: 'bg-gradient-to-r from-rose-500 to-amber-500',
          glowShadow: 'shadow-rose-950/40',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          borderColor: 'border-amber-500/60',
          bgGradient: 'from-slate-900/98 via-amber-950/30 to-slate-900/98',
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/20 border-amber-500/40',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          progressBar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
          glowShadow: 'shadow-amber-950/40',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          borderColor: 'border-emerald-500/60',
          bgGradient: 'from-slate-900/98 via-emerald-950/30 to-slate-900/98',
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/20 border-emerald-500/40',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          progressBar: 'bg-emerald-500',
          glowShadow: 'shadow-emerald-950/40',
        };
      case 'info':
      default:
        return {
          icon: Info,
          borderColor: 'border-cyan-500/60',
          bgGradient: 'from-slate-900/98 via-cyan-950/30 to-slate-900/98',
          iconColor: 'text-cyan-400',
          iconBg: 'bg-cyan-500/20 border-cyan-500/40',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          progressBar: 'bg-cyan-500',
          glowShadow: 'shadow-cyan-950/40',
        };
    }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.92 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-full max-w-md bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-xl shadow-2xl ${config.glowShadow} backdrop-blur-md overflow-hidden pointer-events-auto select-none`}
      role="alert"
      aria-live="assertive"
    >
      {/* Top Header */}
      <div className="p-3.5 pb-2.5 flex items-start gap-3">
        <div className={`p-2 rounded-lg border ${config.iconBg} ${config.iconColor} shrink-0 mt-0.5 animate-pulse`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${config.badgeBg}`}>
                {toast.severity === 'error' ? 'Engineering Violation' : 'Engineering Advisory'}
              </span>
              {toast.parameterName && (
                <span className="text-[10px] font-mono text-slate-400">
                  [{toast.parameterName}]
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleSound}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded hover:bg-slate-800/60"
                title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="p-1 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-800/60"
                title="Dismiss Warning"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h4 className="text-xs font-bold text-white tracking-tight">
            {toast.title}
          </h4>

          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
            {toast.message}
          </p>

          {/* Diagnostic Metrics Pills */}
          {(toast.enteredValue !== undefined || toast.safeRange) && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[10px] font-mono">
              {toast.enteredValue !== undefined && (
                <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1">
                  <span className="text-slate-400">Entered:</span>
                  <span className="font-bold">{toast.enteredValue}</span>
                </div>
              )}

              {toast.safeRange && (
                <div className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 flex items-center gap-1">
                  <span className="text-slate-400">Safe Range:</span>
                  <span className="font-bold">{toast.safeRange}</span>
                </div>
              )}

              {toast.engineeringStandard && (
                <div className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">
                  {toast.engineeringStandard}
                </div>
              )}
            </div>
          )}

          {/* Quick Action Button (e.g. Auto-Fix) */}
          {toast.action && (
            <div className="mt-2.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Wrench className="w-3 h-3" />
                <span>{toast.action.label}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      <div className="w-full bg-slate-800/80 h-1 overflow-hidden">
        <div
          className={`h-full ${config.progressBar} transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

export const EngineeringToastContainer: React.FC = () => {
  const { toasts, dismissToast, soundEnabled, toggleSound, clearToasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Engineering Warnings & Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100vw-2rem)] pointer-events-none no-print"
    >
      <div className="flex items-center justify-end gap-2 pr-1 pointer-events-auto">
        {toasts.length > 1 && (
          <button
            type="button"
            onClick={clearToasts}
            className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900/90 border border-slate-700/60 rounded px-2 py-0.5 backdrop-blur transition-colors"
          >
            Clear All ({toasts.length})
          </button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
};
