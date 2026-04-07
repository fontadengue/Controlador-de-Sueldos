
export type ConvenioType = 'comercio' | 'sanidad' | 'vigilancia';

export interface DeductionValidation {
  present: boolean;
  actual?: number;
  expected?: number;
  difference?: number;
  isCorrect?: boolean;
}

export interface AuditResult {
  pageNumber: number;
  employeeName: string;
  convenio: ConvenioType;

  // Haberes
  totalHaberes: number;
  totalNonRemunerative: number;

  // Validaciones individuales
  jubilacion: DeductionValidation;      // 0300 - 11% rem
  ley19032: DeductionValidation;        // 0302 - 3% rem
  obraSocial: DeductionValidation;      // 0310 o 0307 - 3% rem
  aporteOsNoRem: DeductionValidation;   // 0313 o 0317 - 3% no rem (solo OSECAC - Comercio)
  aportesSindical: DeductionValidation; // 0322 - 2% rem+noRem (Comercio)
  faecys: DeductionValidation;          // 0332 - 0.5% rem+noRem (Comercio)
  cuotaSolidaridad: DeductionValidation;// 0345 - 1% rem (Sanidad)

  // Metadata
  tieneOsecac: boolean;
  esJornadaReducida: boolean;
  jornadaHoras?: number;

  isCorrect: boolean;
  status: 'success' | 'error' | 'skipped';
  skipped?: boolean;
  ignoreReason?: string;
  errorMessage?: string;
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  currentStep?: string;
  progress: number;
  error?: string;
}
