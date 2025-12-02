
export interface AuditResult {
  pageNumber: number;
  employeeName: string;
  totalHaberes: number;
  totalNonRemunerative: number;
  
  // Jubilacion (11%)
  jubilacionDeduction: number;
  expectedJubilacion: number;
  jubilacionDifference: number;
  isJubilacionCorrect: boolean;

  // Code 0302 (3%)
  hasCode0302: boolean;
  code0302Deduction?: number;
  expectedCode0302?: number;
  code0302Difference?: number;
  isCode0302Correct?: boolean;

  // Code 0307 (3% of Total Haberes)
  hasCode0307: boolean;
  code0307Deduction?: number;
  expectedCode0307?: number;
  code0307Difference?: number;
  isCode0307Correct?: boolean;

  // Code 0322 (2% of Total Haberes + NonRemunerative)
  hasCode0322: boolean;
  code0322Deduction?: number;
  expectedCode0322?: number;
  code0322Difference?: number;
  isCode0322Correct?: boolean;

  // Code 0332 (0.5% of Total Haberes + NonRemunerative)
  hasCode0332: boolean;
  code0332Deduction?: number;
  expectedCode0332?: number;
  code0332Difference?: number;
  isCode0332Correct?: boolean;

  isCorrect: boolean; // Overall status
  status: 'success' | 'warning' | 'error' | 'skipped';
  rawResponse?: string;
  skipped?: boolean;
  ignoreReason?: string;
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  currentStep?: string;
  progress: number; // 0 to 100
  error?: string;
}

export enum ValidationStatus {
  CORRECT = 'CORRECT',
  INCORRECT = 'INCORRECT',
  UNCERTAIN = 'UNCERTAIN'
}
