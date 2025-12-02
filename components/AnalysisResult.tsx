
import React from 'react';
import { AuditResult } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';

interface Props {
  result: AuditResult;
}

export const AnalysisResult: React.FC<Props> = ({ result }) => {
  const isError = !result.isCorrect;

  const renderCodeValidation = (
    label: string, 
    isCorrect: boolean | undefined, 
    actual: number | undefined, 
    expected: number | undefined, 
    difference: number | undefined
  ) => {
    return (
      <div className={`p-3 rounded-lg border ${isCorrect === false ? 'bg-red-100 border-red-200' : 'bg-green-50 border-green-100'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-800 text-sm">{label}</span>
          {isCorrect === false ? (
            <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded flex items-center gap-1">
              <XCircle size={12}/> Incorrecto
            </span>
          ) : (
            <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 size={12}/> Correcto
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">En Recibo</p>
            <p className="font-mono font-semibold">${actual?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Calculado</p>
            <p className="font-mono font-semibold">${expected?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
         {isCorrect === false && (
            <div className="mt-2 text-xs font-semibold text-red-600 border-t border-red-200 pt-1">
              Diferencia: ${difference?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          )}
      </div>
    );
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all ${isError ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
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
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isError ? 'bg-red-200 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {isError ? 'Revisar' : 'Aprobado'}
        </div>
      </div>

      <div className="bg-white/60 p-3 rounded-lg border border-gray-100 mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-500 mb-1 text-xs uppercase tracking-wide font-semibold">Total Haberes</p>
          <p className="font-mono text-xl font-semibold text-gray-900">
            ${result.totalHaberes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-gray-500 mb-1 text-xs uppercase tracking-wide font-semibold">Total No Remun.</p>
          <p className="font-mono text-xl font-semibold text-gray-900">
            ${result.totalNonRemunerative.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Verification 1: Jubilacion */}
        {renderCodeValidation(
            "Jubilación (11%)", 
            result.isJubilacionCorrect, 
            result.jubilacionDeduction, 
            result.expectedJubilacion, 
            result.jubilacionDifference
        )}

        {/* Verification 2: Code 0302 */}
        {result.hasCode0302 && renderCodeValidation(
            "Cód. 0302 - Ley 19032 (3%)",
            result.isCode0302Correct,
            result.code0302Deduction,
            result.expectedCode0302,
            result.code0302Difference
        )}

        {/* Verification 3: Code 0307 */}
        {result.hasCode0307 && renderCodeValidation(
            "Cód. 0307 (3% Haberes)",
            result.isCode0307Correct,
            result.code0307Deduction,
            result.expectedCode0307,
            result.code0307Difference
        )}

        {/* Verification 4: Code 0322 */}
        {result.hasCode0322 && renderCodeValidation(
            "Cód. 0322 (2% Haberes + No Rem)",
            result.isCode0322Correct,
            result.code0322Deduction,
            result.expectedCode0322,
            result.code0322Difference
        )}

        {/* Verification 5: Code 0332 */}
        {result.hasCode0332 && renderCodeValidation(
            "Cód. 0332 (0.5% Haberes + No Rem)",
            result.isCode0332Correct,
            result.code0332Deduction,
            result.expectedCode0332,
            result.code0332Difference
        )}
      </div>

      {isError && (
        <div className="mt-4 flex items-start gap-2 text-xs text-red-700 bg-red-100/50 p-3 rounded-md">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            <strong>Atención:</strong> Se detectaron inconsistencias en los cálculos. 
            Verifique los montos base.
          </p>
        </div>
      )}
    </div>
  );
};
