import React, { useState } from 'react';
import { UploadCloud, FileType, RefreshCw, CheckCircle, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { convertPdfToImages } from './utils/pdfUtils';
import { analyzeReceiptImage } from './services/geminiService';
import { AuditResult, ProcessingState } from './types';
import { AnalysisResult } from './components/AnalysisResult';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0
  });
  const [results, setResults] = useState<AuditResult[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setProcessingState({ status: 'idle', progress: 0 });
      setResults([]);
    }
  };

  const processFile = async () => {
    if (!file) return;

    try {
      setProcessingState({ status: 'processing', progress: 5, currentStep: 'Convirtiendo PDF a imágenes...' });
      
      const images = await convertPdfToImages(file);
      
      setProcessingState({ status: 'processing', progress: 20, currentStep: 'Analizando recibos con IA...' });

      const totalImages = images.length;
      let completedCount = 0;
      const concurrencyLimit = 5; 
      const resultPromises: Promise<AuditResult>[] = [];
      const executing: Promise<void>[] = [];

      // OPTIMIZATION: Process only odd pages (1, 3, 5...) assuming Page N is Original and N+1 is Duplicate.
      // This reduces API calls by 50% and speeds up analysis significantly.
      for (let i = 0; i < totalImages; i += 2) {
        
        const p = analyzeReceiptImage(images[i], i + 1).then((result) => {
          completedCount++;
          // Estimate progress based on processing half the pages
          const effectiveTotal = Math.ceil(totalImages / 2);
          const progress = 20 + Math.floor((completedCount / effectiveTotal) * 80);
          
          setProcessingState(prev => ({ 
            ...prev,
            status: 'processing', 
            progress: Math.min(progress, 100), 
            currentStep: `Analizando recibo original ${completedCount} de ${effectiveTotal}...` 
          }));
          return result;
        });

        resultPromises.push(p);

        const e: Promise<void> = p.then(() => {
          executing.splice(executing.indexOf(e), 1);
        });
        executing.push(e);

        if (executing.length >= concurrencyLimit) {
          await Promise.race(executing);
        }
      }

      const allResults = await Promise.all(resultPromises);
      
      // Filter out receipts that were marked as skipped (e.g. no jubilacion found)
      const validResults = allResults.filter(r => !r.skipped);

      setResults(validResults);
      setProcessingState({ status: 'completed', progress: 100 });

    } catch (error) {
      console.error(error);
      setProcessingState({ 
        status: 'error', 
        progress: 0, 
        error: 'Ocurrió un error al procesar el archivo. Asegúrate de que es un PDF válido.' 
      });
    }
  };

  // Group results by Employee Name
  const groupedResults = results.reduce((acc, result) => {
    const key = result.employeeName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(result);
    return acc;
  }, {} as Record<string, AuditResult[]>);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-700">
            <div className="bg-brand-600 text-white p-1.5 rounded-lg">
              <FileType size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AuditCheck</h1>
          </div>
          <div className="text-sm text-gray-500">
            Control de Deducciones
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro Section */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Auditoría Inteligente de Haberes
          </h2>
          <p className="text-gray-600 text-lg">
            Sube tu PDF con los recibos de sueldo. El sistema analizará solo los originales (páginas impares) para mayor velocidad y verificará la jubilación.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center transition-all hover:border-brand-300">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-brand-50 text-brand-600 rounded-full">
              <UploadCloud size={48} />
            </div>
            <div>
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-semibold text-gray-900">
                  {file ? file.name : "Selecciona un archivo PDF"}
                </span>
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  accept=".pdf" 
                  className="sr-only" 
                  onChange={handleFileChange}
                />
                <span className="mt-1 block text-sm text-gray-500">
                  {file ? "Haz clic para cambiar" : "Solo archivos PDF hasta 10MB"}
                </span>
              </label>
            </div>
            
            {file && processingState.status !== 'processing' && (
              <button
                onClick={processFile}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
              >
                <Zap size={20} className="text-yellow-300" />
                Comenzar Auditoría Rápida
              </button>
            )}
            {file && processingState.status !== 'processing' && (
              <p className="text-xs text-gray-400">
                Modo Rápido: Se analizan solo páginas impares (1, 3, 5...) asumiendo duplicados en pares.
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {processingState.status === 'processing' && (
            <div className="mt-8 max-w-md mx-auto">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-brand-700">{processingState.currentStep}</span>
                <span className="text-sm font-medium text-brand-700">{processingState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-brand-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${processingState.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {processingState.error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2 justify-center">
              <AlertTriangle size={20} />
              {processingState.error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Resultados del Análisis</h3>
              <div className="flex gap-4 text-sm font-medium">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={16} />
                  {results.filter(r => r.isCorrect).length} recibos correctos
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle size={16} />
                  {results.filter(r => !r.isCorrect).length} recibos a revisar
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {Object.keys(groupedResults).map((employee) => {
                const employeeResults = groupedResults[employee];
                return (
                  <div key={employee} className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-500 uppercase tracking-wider ml-1">
                      {employee}
                    </h4>
                    {employeeResults.map((result, idx) => (
                      <AnalysisResult key={`${result.pageNumber}-${idx}`} result={result} />
                    ))}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-center pt-8">
               <button 
                onClick={() => { setFile(null); setResults([]); setProcessingState({status: 'idle', progress: 0}); }}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Analizar otro archivo
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;