# Controlador de Sueldos

App para auditar recibos de sueldo en Argentina usando IA (Gemini).

## Funcionalidades
- Carga de PDF con múltiples recibos
- Extracción automática de haberes y deducciones via OCR con IA
- Validación de:
  - Jubilación (11% de haberes)
  - Cód. 0302 - Ley 19032 (3%)
  - Cód. 0307 (3% de haberes)
  - Cód. 0322 (2% de haberes + no remunerativos)
  - Cód. 0332 (0.5% de haberes + no remunerativos)
- Resultados agrupados por empleado

## Stack
- React 19 + TypeScript
- Vite
- Tailwind CSS
- PDF.js para conversión de PDF a imágenes
- Google Gemini 2.5 Flash para OCR y análisis

