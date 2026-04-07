import React from 'react';
import { AuditResult, DeductionValidation } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Minus } from 'lucide-react';

interface Props { result: AuditResult; }

const Row: React.FC<{ label: string; v: DeductionValidation }> = ({ label, v }) => {
  if (!v.present) return null;

  const ok = v.isCorrect;
  return (
    <div className={`p-3 rounded-lg border ${ok ? 'bg-green-50 border-green-100' : 'bg-red-100 border-red-200'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-800 text-sm">{label}</span>
        {ok ? (
          <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded flex items-center gap-1">
            <CheckCircle2 size={12} /> Correcto
          </span>
        ) : (
          <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded flex items-center gap-1">
            <XCircle size={12} /> Incorrecto
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">En Recibo</p>
          <p className="font-mono font-semibold">${v.actual?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Calculado</p>
          <p className="font-mono font-semibold">${v.expected?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      {!ok && (
        <div className="mt-2 text-xs font-semibold text-red-600 border-t border-red-200 pt-1">
          Diferencia: ${v.difference?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
};

export const AnalysisResult: React.FC<Props> = ({ result }) => {
  const isError = !result.isCorrect;
  const isZeroSalary = result.totalHaberes === 0;

  const obraSocialLabel = result.esJornadaReducida
    ? 'Cód. 0307 - Obra Social Jornada Reducida (3% rem)'
    : 'Cód. 0310 - Obra Social (3% rem)';

  const osNoRemLabel = result.esJornadaReducida
    ? 'Cód. 0317 - OS Acuerdo Colectivo Jornada Reducida (3% no rem)'
    : 'Cód. 0313 - OS Acuerdo Colectivo OSECAC (3% no rem)';

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all ${isError ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {isError ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{result.employeeName}</h3>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <FileText size={14} /> Página {result.pageNumber} del PDF
            </span>
            <div className="flex gap-2 mt-1 flex-wrap">
              {result.tieneOsecac && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">OSECAC</span>
              )}
              {result.esJornadaReducida && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Jornada Reducida</span>
              )}
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isError ? 'bg-red-200 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {isError ? 'Revisar' : 'Aprobado'}
        </div>
      </div>

      {/* API error message */}
      {result.errorMessage && (
        <div className="mb-4 p-4 bg-red-100 rounded-xl border border-red-300">
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Error de API al procesar este recibo</p>
              <p className="text-xs mt-1 font-mono break-all">{result.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Zero salary warning */}
      {isZeroSalary && !result.errorMessage && (
        <div className="mb-6 p-6 bg-red-600 rounded-xl shadow-lg border-4 border-red-800 animate-pulse">
          <div className="flex flex-col items-center text-center text-white">
            <AlertTriangle size={48} className="mb-2" />
            <h2 className="text-2xl font-black uppercase tracking-wider">¡ADVERTENCIA CRÍTICA!</h2>
            <p className="text-lg font-bold mt-1">EL TOTAL DE HABERES ES $0.00 O NO SE PUDO LEER</p>
            <p className="text-sm opacity-90 mt-2">Revise manualmente este recibo.</p>
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="bg-white/60 p-3 rounded-lg border border-gray-100 mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-500 mb-1 text-xs uppercase tracking-wide font-semibold">Total Haberes Rem.</p>
          <p className="font-mono text-xl font-semibold text-gray-900">
            ${result.totalHaberes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-gray-500 mb-1 text-xs uppercase tracking-wide font-semibold">Total No Rem.</p>
          <p className="font-mono text-xl font-semibold text-gray-900">
            ${result.totalNonRemunerative.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Validaciones */}
      <div className="space-y-3">
        <Row label="Cód. 0300 - Jubilación (11% rem)" v={result.jubilacion} />
        <Row label="Cód. 0302 - Ley 19032 (3% rem)" v={result.ley19032} />
        <Row label={obraSocialLabel} v={result.obraSocial} />
        {result.tieneOsecac && <Row label={osNoRemLabel} v={result.aporteOsNoRem} />}
        <Row label="Cód. 0322 - Aporte Sindical (2% rem+no rem)" v={result.aportesSindical} />
        <Row label="Cód. 0332 - FAECYS (0.5% rem+no rem)" v={result.faecys} />
      </div>

      {isError && !isZeroSalary && (
        <div className="mt-4 flex items-start gap-2 text-xs text-red-700 bg-red-100/50 p-3 rounded-md">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p><strong>Atención:</strong> Se detectaron inconsistencias en los cálculos. Verificá los montos base.</p>
        </div>
      )}
    </div>
  );
};
