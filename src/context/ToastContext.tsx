import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastItem, GeometryValidationResult, ToastSeverity } from '../types/toast';
import { playInvalidInputChime } from '../utils/geometryValidation';

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  showInvalidInputWarning: (
    validation: GeometryValidationResult,
    onApplyRecommended?: () => void
  ) => string;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('coiled_matrix_toast_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('coiled_matrix_toast_sound', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id' | 'timestamp'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        ...toast,
        id,
        timestamp: Date.now(),
        autoDismissMs: toast.autoDismissMs ?? 6000,
      };

      if (soundEnabled && (toast.severity === 'error' || toast.severity === 'warning')) {
        playInvalidInputChime(toast.severity);
      }

      setToasts((prev) => {
        // If an existing toast for the same parameter already exists, replace it to avoid stacking duplicates
        if (toast.parameterName) {
          const filtered = prev.filter((t) => t.parameterName !== toast.parameterName);
          return [newToast, ...filtered.slice(0, 3)];
        }
        return [newToast, ...prev.slice(0, 3)];
      });

      return id;
    },
    [soundEnabled]
  );

  const showInvalidInputWarning = useCallback(
    (
      validation: GeometryValidationResult,
      onApplyRecommended?: () => void
    ): string => {
      return addToast({
        title: validation.title,
        message: validation.message,
        severity: validation.severity === 'warning' ? 'warning' : 'error',
        parameterName: validation.parameterName,
        enteredValue: validation.enteredDisplayValue,
        safeRange: validation.safeRangeDisplay,
        engineeringStandard: validation.engineeringStandard,
        autoDismissMs: 7000,
        action:
          validation.recommendedValue !== undefined && onApplyRecommended
            ? {
                label: `Auto-Fix (${validation.recommendedDisplayValue || 'Safe'})`,
                onClick: () => {
                  onApplyRecommended();
                },
                variant: 'primary',
              }
            : undefined,
      });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        dismissToast,
        clearToasts,
        showInvalidInputWarning,
        soundEnabled,
        toggleSound,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
