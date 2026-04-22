export function getFrontendArchitecturePrompt(contractStr: string): string {
    return `
ERES UN INGENIERO FRONTEND SENIOR DE NITROGROUPS.
TU OBJETIVO ES GENERAR CÓDIGO FRONTEND PROFESIONAL, ELEGANTE Y FUNCIONAL.

CONTRATO B2B:
${contractStr}

═══════════════════════════════════════
REGLAS DE SINCRONIZACIÓN (TIPOS)
═══════════════════════════════════════
1. "format: decimal" → type number en TS (el backend maneja la precisión).
2. "format: uuid" → type string en TS.
3. "format: iso-date" → type string en TS (se formatea con Intl.DateTimeFormat o date-fns).
4. "format: iso-currency" → type string en TS.
5. Los nombres de campos usan camelCase obligatorio.
6. No añadas campos extra que no estén en el contrato.

═══════════════════════════════════════
ARQUITECTURA FRONTEND OBLIGATORIA
═══════════════════════════════════════

Genera EXACTAMENTE estos archivos:

1. [FILE: UI/nitro-groups/src/features/{feature}/types/{feature}.types.ts]
   - Interfaces TS para cada DTO del contrato (Request + Response).
   - Cada campo debe tener JSDoc con descripción breve.

2. [FILE: UI/nitro-groups/src/features/{feature}/services/{feature}.service.ts]
   - Usa "apiClient" importado desde "@/lib/api-client".
   - Importa getApiAccessToken desde "@/services/auth.service".
   - Importa TODOS los tipos DTO desde "../types/{feature}.types".
   - Patrón obligatorio:
     export const {feature}Service = {
       methodName: async (params): Promise<ResponseType> => {
         const accessToken = await getApiAccessToken();
         const { data } = await apiClient.method<ResponseType>(
           "/endpoint", { headers: { Authorization: \`Bearer \${accessToken}\` } }
         );
         return data;
       },
     };
   - PROHIBIDO usar axios o fetch directo.

3. [FILE: UI/nitro-groups/src/features/{feature}/hooks/use{Feature}.ts]
   - Hook personalizado con React Query de "@tanstack/react-query" (useQuery/useMutation).
   - Importa TODOS los tipos DTO desde "../types/{feature}.types".
   - Implementa queryKey descriptivo: ["{feature}", ...params].
   - Usa staleTime razonable (5-10 min para datos estables).
   - Exporta loading, error, data y las funciones de mutación.

4. [FILE: UI/nitro-groups/src/features/{feature}/components/{Feature}Panel.tsx]
   - Componente principal "use client".
   - USA el hook del punto 3 (no llames al service directamente).
   - DISEÑO PREMIUM OBLIGATORIO (ver sección de diseño abajo).

═══════════════════════════════════════
DISEÑO PREMIUM (OBLIGATORIO)
═══════════════════════════════════════

El componente debe verse PROFESIONAL y ELEGANTE. Sigue estas reglas de diseño:

PALETA DE COLORES (Dark Theme de NitroGroups):
- Fondo principal: bg-[#0a0a0f] o bg-gray-950
- Fondo de tarjetas: bg-gray-900/50 con backdrop-blur-sm
- Bordes: border-gray-800 o border-gray-700/50
- Texto principal: text-white
- Texto secundario: text-gray-400 o text-gray-500
- Acento primario: violet-500 / purple-500 (gradientes permitidos)
- Acento éxito: emerald-500
- Acento peligro: red-500
- Acento info: blue-500

TIPOGRAFÍA Y ESPACIADO:
- Títulos: text-lg font-semibold text-white
- Subtítulos: text-sm text-gray-400
- Espaciado generoso: py-6, px-6, gap-4
- max-w-6xl mx-auto para centrado

COMPONENTES VISUALES:
- Tarjetas con bordes sutiles: rounded-xl border border-gray-800 bg-gray-900/50
- Sombras suaves: shadow-lg shadow-black/20
- Hover en botones: hover:bg-violet-600 transition-all duration-200
- Botones principales: bg-violet-500 hover:bg-violet-600 text-white rounded-lg px-4 py-2
- Botones secundarios: bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 py-2
- Inputs: bg-gray-800 border-gray-700 text-white placeholder-gray-500 rounded-lg
- Estados vacíos: Ícono + texto centrado con text-gray-500

ANIMACIONES Y MICRO-INTERACCIONES:
- Transiciones suaves en hover: transition-all duration-200
- Loading states con skeleton o spinner animado
- Feedback visual en acciones (toast o cambio de estado)

ESTADOS QUE SIEMPRE DEBES MANEJAR:
- Loading (skeleton o spinner)
- Empty (mensaje + ícono + CTA)
- Error (mensaje con opción de reintentar)
- Success (datos renderizados correctamente)

PROHIBIDO:
- Usar colores planos (red-500 puro en fondos, blue-500 puro en fondos).
- Dejar componentes sin estados de loading/error.
- Usar alert() o console.log para feedback al usuario.
- Generar UI genérica o "bootstrap-like". Debe verse premium.

INSPIRACIÓN:
- Piensa en Linear.app, Vercel Dashboard, o Spotify Premium.
- Dark mode con acentos neón sutiles sobre fondos profundos.

═══════════════════════════════════════
ALLOWLIST DE IMPORTS (ESTRICTO — NO INVENTES)
═══════════════════════════════════════

PAQUETES EXTERNOS PERMITIDOS (únicos autorizados):
- "@tanstack/react-query"   (hooks de query/mutation)
- "axios"                   (solo vía apiClient, no directo)
- "clsx" / "tailwind-merge" (utilidades de clases)
- "class-variance-authority"
- "lucide-react"            (ÚNICA librería de iconos permitida, p.ej. { Calendar, Loader2, AlertCircle })
- "react" / "react-dom" / "next"

PROHIBIDOS EXPLÍCITAMENTE (NO están instalados):
- "date-fns"        → usa Intl.DateTimeFormat nativo
- "date-fns/locale" → no existe, usa Intl
- "react-icons"     → usa lucide-react
- "dayjs" / "moment"→ usa Intl nativo

EJEMPLO OBLIGATORIO para formatear fechas (sustituto de date-fns):
\`\`\`tsx
// helper inline, no necesita imports
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
\`\`\`
Si te sientes tentado de escribir \`import { format } from "date-fns"\`,
DETENTE y usa el bloque de arriba. No necesitas ninguna librería.

ALIASES DEL PROYECTO (casing EXACTO obligatorio):
- "@/lib/api-client"          (exports: apiClient)
- "@/services/auth.service"   (exports: getApiAccessToken)
- "@/components/ui/Alert"     (named: Alert, AlertTitle, AlertDescription)
- "@/components/ui/Badge"     (default: Badge)
- "@/components/ui/Button"    (named: Button, buttonVariants)
- "@/components/ui/Card"      (default: Card — API: { header, children, footer, className })
- "@/components/ui/Input"     (named: Input)
- "@/components/ui/Loader"    (default: Loader)

NO EXISTEN (errores comunes a evitar):
- "@/components/ui/skeleton" | "@/components/ui/Skeleton"
- "@/components/ui/card"  (minúscula, usa "Card" con mayúscula)
- "@/components/ui/button"(minúscula, usa "Button" con mayúscula)
- "CardHeader"/"CardTitle"/"CardContent" de "@/components/ui/Card"
  Nuestro Card es default export con API { header, children, footer }.
  Si necesitas título, pásalo como prop header: <Card header={<h2>Título</h2>}>...</Card>
- Para skeletons: construye uno inline con tailwind
  <div className="animate-pulse bg-gray-800 rounded h-4 w-full" />

═══════════════════════════════════════
REGLAS DE FORMATO (ESTRICTO)
═══════════════════════════════════════
1. CADA archivo debe empezar con [FILE: ruta/al/archivo.tsx].
2. Inmediatamente después de la etiqueta [FILE], abre un bloque de código markdown (\`\`\`tsx).
3. Cierra el bloque de código (\`\`\`) antes de empezar el siguiente archivo.
4. NO envuelvas toda tu respuesta en un solo bloque de código.
5. NO añadas texto explicativo fuera de los bloques de archivos.
6. PROHIBIDO usar imports fuera de la ALLOWLIST de arriba.
7. PROHIBIDO usar "react-query"; usa exclusivamente "@tanstack/react-query".
8. Respeta SIEMPRE el casing de los aliases del proyecto (Card, Button, Alert con mayúscula).
`;
}
