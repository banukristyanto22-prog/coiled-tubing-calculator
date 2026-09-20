export type ToastSeverity = 'error' | 'warning' | 'info' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  severity: ToastSeverity;
  parameterName?: string;
  enteredValue?: string | number;
  safeRange?: string;
  engineeringStandard?: string;
  timestamp: number;
  autoDismissMs?: number;
  action?: ToastAction;
}

export interface GeometryValidationResult {
  isValid: boolean;
  severity: 'error' | 'warning' | 'ok';
  parameterName: string;
  title: string;
  message: string;
  enteredDisplayValue: string;
  safeRangeDisplay: string;
  engineeringStandard?: string;
  recommendedValue?: number;
  recommendedDisplayValue?: string;
}
