import React, { useState } from 'react';
import { UploadCloud, RefreshCw, CheckCircle, AlertTriangle, Zap, BarChart3, ChevronRight, Briefcase, Printer } from 'lucide-react';
import { convertPdfToImages } from './utils/pdfUtils';
import { analyzeReceiptImage } from './services/geminiService';
import { AuditResult, ProcessingState, ConvenioType } from './types';
import { AnalysisResult } from './components/AnalysisResult';

const CONVENIOS: { id: ConvenioType; label: string; description: string; color: string }[] = [
  { id: 'comercio',   label: 'Empleados de Comercio',    description: 'CCT 130/75 — Jubilación, OS, Sindical 2%, FAECYS',          color: 'border-blue-400 hover:border-blue-500' },
  { id: 'sanidad',    label: 'Empleados de Sanidad',      description: 'CCT 180/75 — Jubilación, OS, Cuota Solidaridad 1%',         color: 'border-green-400 hover:border-green-500' },
  { id: 'vigilancia', label: 'Vigilancia Privada',        description: 'CCT 426/05 — Jubilación, OS, Sindical 3%',                  color: 'border-red-400 hover:border-red-500' },
  { id: 'faatra',     label: 'Talleres Automotores',      description: 'CCT 27/88 FAATRA-SMATA — Jubilación, OS, Sindical 5%',      color: 'border-orange-400 hover:border-orange-500' },
  { id: 'farmacia',   label: 'Farmacia',                  description: 'CCT 426/05 SF — Jubilación, OS, Sindical 3%, Art.47 10%',   color: 'border-purple-400 hover:border-purple-500' },
];

const App: React.FC = () => {
  const [convenio, setConvenio] = useState<ConvenioType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [results, setResults] = useState<AuditResult[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setProcessingState({ status: 'idle', progress: 0 });
      setResults([]);
    }
  };

  const processFile = async () => {
    if (!file || !convenio) return;
    try {
      setProcessingState({ status: 'processing', progress: 5, currentStep: 'Convirtiendo PDF a imágenes...' });
      const images = await convertPdfToImages(file);
      setProcessingState({ status: 'processing', progress: 20, currentStep: 'Analizando recibos...' });

      const totalImages = images.length;
      const effectiveTotal = Math.ceil(totalImages / 2);
      const validResults: AuditResult[] = [];

      for (let i = 0; i < totalImages; i += 2) {
        const idx = Math.floor(i / 2) + 1;
        setProcessingState({
          status: 'processing',
          progress: 20 + Math.floor((idx - 1) / effectiveTotal * 80),
          currentStep: `Analizando recibo ${idx} de ${effectiveTotal}...`,
        });

        const result = await analyzeReceiptImage(images[i], i + 1, convenio);
        if (!result.skipped) validResults.push(result);

        // Pausa de 4s entre recibos para no superar el límite de 15 req/min de Gemini
        if (i + 2 < totalImages) {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      setResults(validResults);
      setProcessingState({ status: 'completed', progress: 100 });

    } catch (error) {
      console.error(error);
      setProcessingState({
        status: 'error',
        progress: 0,
        error: 'Ocurrió un error al procesar el archivo. Asegurate de que es un PDF válido.',
      });
    }
  };

  const reset = () => {
    setFile(null);
    setResults([]);
    setProcessingState({ status: 'idle', progress: 0 });
    setConvenio(null);
  };

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
          <div className="flex items-center gap-3">
            <img
              src="https://www.estudiodutto.com.ar/img/logoestudio.png"
              alt="Estudio Dutto"
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-bold tracking-tight">Auditador de Recibos de Sueldo</h1>
          </div>
          {convenio && (
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
              <RefreshCw size={14} /> Cambiar convenio
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* STEP 1: Selección de convenio */}
        {!convenio && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Auditoría de Haberes</h2>
              <p className="text-gray-600 text-lg">Seleccioná el convenio colectivo para comenzar</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {CONVENIOS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConvenio(c.id)}
                  className={`bg-white rounded-2xl border-2 ${c.color} p-6 text-left shadow-sm hover:shadow-md transition-all group`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-brand-50 rounded-lg group-hover:bg-brand-100 transition-colors">
                      <Briefcase className="text-brand-600 h-6 w-6" />
                    </div>
                    <ChevronRight className="text-gray-400 group-hover:text-brand-600 transition-colors" size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{c.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Upload */}
        {convenio && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <span className="inline-block bg-brand-100 text-brand-700 text-sm font-semibold px-3 py-1 rounded-full mb-3">
                {CONVENIOS.find(c => c.id === convenio)?.label}
              </span>
              <h2 className="text-3xl font-bold text-gray-900">Cargá el PDF de recibos</h2>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center hover:border-brand-300 transition-all">
              <div className="flex flex-col items-center justify-center space-y-4">
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center w-full group">
                  <div className="p-4 bg-brand-50 text-brand-600 rounded-full group-hover:bg-brand-100 transition-colors duration-200">
                    <UploadCloud size={48} />
                  </div>
                  <div className="mt-4">
                    <span className="block text-sm font-semibold text-gray-900">
                      {file ? file.name : 'Seleccioná un archivo PDF'}
                    </span>
                    <input id="file-upload" name="file-upload" type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                    <span className="mt-1 block text-sm text-gray-500">
                      {file ? 'Hacé clic para cambiar' : 'Solo archivos PDF hasta 10MB'}
                    </span>
                  </div>
                </label>

                {file && processingState.status !== 'processing' && (
                  <button
                    onClick={processFile}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
                  >
                    <Zap size={20} className="text-yellow-300" />
                    Comenzar auditoría
                  </button>
                )}
              </div>

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
                    />
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
          </div>
        )}

        {/* STEP 3: Results */}
        {results.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Título visible solo al imprimir */}
            <div className="print-title mb-4">
              <h1 style={{fontSize:'20px', fontWeight:'bold', marginBottom:'4px'}}>Auditoría de Haberes — {CONVENIOS.find(c => c.id === convenio)?.label}</h1>
              <p style={{fontSize:'13px', color:'#555'}}>Fecha: {new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })}</p>
              <hr style={{marginTop:'8px'}}/>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Resultados del Análisis</h3>
              <div className="flex gap-4 text-sm font-medium">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={16} />
                  {results.filter(r => r.isCorrect).length} correctos
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle size={16} />
                  {results.filter(r => !r.isCorrect).length} a revisar
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {Object.keys(groupedResults).map((employee) => (
                <div key={employee} className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-500 uppercase tracking-wider ml-1">{employee}</h4>
                  {groupedResults[employee].map((result, idx) => (
                    <AnalysisResult key={`${result.pageNumber}-${idx}`} result={result} />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 pt-8">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <Printer size={18} />
                Imprimir reporte
              </button>
              <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
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
