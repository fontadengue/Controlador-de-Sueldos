import { GoogleGenAI, Type } from "@google/genai";
import { AuditResult, ConvenioType, DeductionValidation } from "../types";

const MODEL_NAME = 'gemini-2.5-flash';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyBKSrNzKBeBfQyKUWlySNp507kxVeFpjRk' });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateWithRetry = async (params: Parameters<typeof ai.models.generateContent>[0], maxRetries = 6) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const msg = error?.message || error?.toString() || '';
      const isRetryable =
        error?.status === 429 ||
        error?.status === 503 ||
        error?.status === 500 ||
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('quota') ||
        msg.includes('rate') ||
        msg.includes('overloaded') ||
        msg.includes('timeout') ||
        msg.includes('network');
      if (isRetryable && attempt < maxRetries - 1) {
        const waitMs = Math.pow(2, attempt) * 3000; // 3s, 6s, 12s, 24s, 48s
        console.warn(`Error en intento ${attempt + 1} (${msg.slice(0, 80)}), reintentando en ${waitMs / 1000}s...`);
        await sleep(waitMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
};

// Tolerance for floating point comparison
const TOLERANCE = 10.0;

const validate = (present: boolean, actual: number, expected: number): DeductionValidation => {
  if (!present) return { present: false };
  const difference = Number(Math.abs(expected - actual).toFixed(2));
  return {
    present: true,
    actual,
    expected,
    difference,
    isCorrect: difference < TOLERANCE,
  };
};

// ─── COMERCIO CCT 130/75 ────────────────────────────────────────────────────

const COMERCIO_PROMPT = `Analizá este recibo de sueldo del CCT 130/75 (Empleados de Comercio). Es una imagen de alta resolución.

PASO 1: VERIFICAR JUBILACIÓN
Buscá el código 0300 (JUBILACION). Si no existe, marcá hasJubilacion=false y no sigas.

PASO 2: DATOS GENERALES
- employeeName: nombre completo del empleado
- totalHaberes: valor de "Total Haberes" (columna remunerativa)
- totalNonRemunerative: valor de "Tot. Hab.s/Desc." o "Total No Remunerativo"

PASO 3: DETECTAR TIPO DE JORNADA Y OBRA SOCIAL
- tieneOsecac: true si la obra social es OSECAC (código 126205). false si es otra OS.
- esJornadaReducida: true si aparece código 0307 o 0317. false si aparece 0310 o 0313.
- jornadaHorasDiarias: horas de jornada diaria si aparece en el recibo (null si no figura)

PASO 4: EXTRAER DEDUCCIONES (todos los que estén presentes, null si no aparecen)
- cod0300_jubilacion: importe del código 0300
- cod0302_ley19032: importe del código 0302
- cod0310_obraSocial: importe del código 0310 (jornada completa, sin OSECAC o con OSECAC)
- cod0307_obraSocialJornRed: importe del código 0307 (jornada reducida)
- cod0313_osAcuerdoColec: importe del código 0313 (OS sobre no rem, con OSECAC, jornada completa)
- cod0317_osAcuerdoColecJRed: importe del código 0317 (OS sobre no rem, con OSECAC, jornada reducida)
- cod0322_aportesSindical: importe del código 0322
- cod0332_faecys: importe del código 0332

FORMATO NUMÉRICO ARGENTINO:
- El punto (.) separa miles: 1.000 = mil
- La coma (,) separa decimales: 50,00 = cincuenta
- Convertí "1.179.320,91" a 1179320.91 en el JSON
- Si un campo no existe en el recibo, retornarlo como null
`;

const COMERCIO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hasJubilacion: { type: Type.BOOLEAN },
    employeeName: { type: Type.STRING },
    totalHaberes: { type: Type.NUMBER },
    totalNonRemunerative: { type: Type.NUMBER },
    tieneOsecac: { type: Type.BOOLEAN },
    esJornadaReducida: { type: Type.BOOLEAN },
    jornadaHorasDiarias: { type: Type.NUMBER },
    cod0300_jubilacion: { type: Type.NUMBER },
    cod0302_ley19032: { type: Type.NUMBER },
    cod0310_obraSocial: { type: Type.NUMBER },
    cod0307_obraSocialJornRed: { type: Type.NUMBER },
    cod0313_osAcuerdoColec: { type: Type.NUMBER },
    cod0317_osAcuerdoColecJRed: { type: Type.NUMBER },
    cod0322_aportesSindical: { type: Type.NUMBER },
    cod0332_faecys: { type: Type.NUMBER },
  },
  required: ['hasJubilacion'],
};

const buildComercioResult = (data: any, pageNumber: number): AuditResult => {
  const totalHaberes = data.totalHaberes || 0;
  const totalNoRem = data.totalNonRemunerative || 0;
  const totalBase = totalHaberes + totalNoRem;
  const tieneOsecac: boolean = !!data.tieneOsecac;
  const esJornadaReducida: boolean = !!data.esJornadaReducida;

  // 0300 - Jubilación: 11% rem
  const jubilacion = validate(
    data.cod0300_jubilacion != null,
    data.cod0300_jubilacion || 0,
    Number((totalHaberes * 0.11).toFixed(2))
  );

  // 0302 - Ley 19032: 3% rem
  const ley19032 = validate(
    data.cod0302_ley19032 != null,
    data.cod0302_ley19032 || 0,
    Number((totalHaberes * 0.03).toFixed(2))
  );

  // 0310 / 0307 - Obra Social: 3% rem
  // Para jornada reducida (0307), el aporte siempre es sobre jornada completa,
  // pero como el sistema recibe el totalHaberes real del recibo (ya proporcional),
  // la base de cálculo para validar es el totalHaberes tal como figura en el recibo.
  // El sistema liquida internamente la proporción; nosotros solo verificamos que
  // lo descontado sea 3% de lo que figura como Total Haberes.
  const obraSocialActual = esJornadaReducida
    ? (data.cod0307_obraSocialJornRed || 0)
    : (data.cod0310_obraSocial || 0);
  const obraSocialPresente = esJornadaReducida
    ? data.cod0307_obraSocialJornRed != null
    : data.cod0310_obraSocial != null;
  const obraSocial = validate(
    obraSocialPresente,
    obraSocialActual,
    Number((totalHaberes * 0.03).toFixed(2))
  );

  // 0313 / 0317 - OS Acuerdo Colectivo sobre No Rem: 3% noRem (solo OSECAC)
  const osNoRemActual = esJornadaReducida
    ? (data.cod0317_osAcuerdoColecJRed || 0)
    : (data.cod0313_osAcuerdoColec || 0);
  const osNoRemPresente = tieneOsecac && (esJornadaReducida
    ? data.cod0317_osAcuerdoColecJRed != null
    : data.cod0313_osAcuerdoColec != null);
  const aporteOsNoRem = validate(
    osNoRemPresente,
    osNoRemActual,
    Number((totalNoRem * 0.03).toFixed(2))
  );

  // 0322 - Aporte Sindical: 2% rem+noRem
  const aportesSindical = validate(
    data.cod0322_aportesSindical != null,
    data.cod0322_aportesSindical || 0,
    Number((totalBase * 0.02).toFixed(2))
  );

  // 0332 - FAECYS: 0.5% rem+noRem
  const faecys = validate(
    data.cod0332_faecys != null,
    data.cod0332_faecys || 0,
    Number((totalBase * 0.005).toFixed(2))
  );

  const isZeroSalary = totalHaberes === 0;
  const isCorrect =
    !isZeroSalary &&
    (jubilacion.isCorrect ?? true) &&
    (ley19032.isCorrect ?? true) &&
    (obraSocial.isCorrect ?? true) &&
    (aporteOsNoRem.isCorrect ?? true) &&
    (aportesSindical.isCorrect ?? true) &&
    (faecys.isCorrect ?? true);

  return {
    pageNumber,
    employeeName: data.employeeName || 'Nombre no identificado',
    convenio: 'comercio',
    totalHaberes,
    totalNonRemunerative: totalNoRem,
    jubilacion,
    ley19032,
    obraSocial,
    aporteOsNoRem,
    aportesSindical,
    faecys,
    tieneOsecac,
    esJornadaReducida,
    jornadaHoras: data.jornadaHorasDiarias ?? undefined,
    isCorrect,
    status: isCorrect ? 'success' : 'error',
    skipped: false,
  };
};

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

export const analyzeReceiptImage = async (
  base64Image: string,
  pageNumber: number,
  convenio: ConvenioType = 'comercio'
): Promise<AuditResult> => {
  const prompt = COMERCIO_PROMPT;
  const schema = COMERCIO_SCHEMA;

  try {
    const response = await generateWithRetry({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error('No data returned from AI');
    const data = JSON.parse(jsonText);

    if (data.hasJubilacion === false) {
      return {
        pageNumber,
        employeeName: data.employeeName || 'Desconocido',
        convenio,
        totalHaberes: 0,
        totalNonRemunerative: 0,
        jubilacion: { present: false },
        ley19032: { present: false },
        obraSocial: { present: false },
        aporteOsNoRem: { present: false },
        aportesSindical: { present: false },
        faecys: { present: false },
        tieneOsecac: false,
        esJornadaReducida: false,
        isCorrect: true,
        status: 'skipped',
        skipped: true,
        ignoreReason: 'No se encontró concepto de Jubilación',
      };
    }

    return buildComercioResult(data, pageNumber);

  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || 'Error desconocido';
    console.error('Gemini analysis failed', errorMsg);
    return {
      pageNumber,
      employeeName: 'Error al analizar',
      convenio,
      totalHaberes: 0,
      totalNonRemunerative: 0,
      jubilacion: { present: false },
      ley19032: { present: false },
      obraSocial: { present: false },
      aporteOsNoRem: { present: false },
      aportesSindical: { present: false },
      faecys: { present: false },
      tieneOsecac: false,
      esJornadaReducida: false,
      isCorrect: false,
      status: 'error',
      skipped: false,
      errorMessage: errorMsg,
    };
  }
};
