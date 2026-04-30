// ─────────────────────────────────────────────────────────────────────────
// services/api.js
// ─────────────────────────────────────────────────────────────────────────
//
// PROPÓSITO:
//   Todas las llamadas HTTP del sistema pasan por aquí.
//   Un solo lugar para el TOKEN y la BASE_URL. Si el token expira,
//   solo cambias el archivo .env — no tienes que buscar en 4 archivos.
//
// ¿QUÉ ES EL ARCHIVO .env?
//   Un archivo de texto que creas en la raíz del proyecto (junto a package.json).
//   Contenido:
//     VITE_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...tu_token_aqui
//     VITE_API_URL=http://localhost:3001
//
//   Vite lee ese archivo y expone las variables como import.meta.env.VITE_xxx
//   NUNCA subas .env a Git — agrégalo a .gitignore
//
// ¿POR QUÉ EXPORTAR TOKEN y BASE_URL?
//   VisorDocumento.jsx, EditorBoletín.jsx y RutaGuardar.jsx necesitan
//   hacer fetch() directamente. Para que todos usen el mismo token,
//   importan { TOKEN, BASE_URL } de aquí en lugar de definirlo cada uno.
//
// ─────────────────────────────────────────────────────────────────────────

import axios from 'axios'

// ── Leer del archivo .env ─────────────────────────────────────────────
// import.meta.env es la forma de Vite de leer variables de entorno.
// El || '' pone cadena vacía como fallback si la variable no está definida,
// así el error es claro (401 en la API) en lugar de fallar silenciosamente.
export const TOKEN    = import.meta.env.VITE_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJtaWxsYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3NzU2NjIxMSwiZXhwIjoxNzc3NTk1MDExfQ.zDQIBM_umyL1iYy6rWukbvVmm9LRD3WdnXtD2Y2pUR4'
export const BASE_URL = import.meta.env.VITE_API_URL   || 'http://localhost:3001'

// Aviso en consola solo en desarrollo (npm run dev)
// import.meta.env.DEV es true en desarrollo y false en producción (npm run build)
if (import.meta.env.DEV && !TOKEN) {
  console.warn(
    '[API] VITE_API_TOKEN no está configurado.\n' +
    'Crea el archivo .env en la raíz del proyecto con:\n' +
    'VITE_API_TOKEN=tu_token_aqui\n' +
    'VITE_API_URL=http://localhost:3001'
  )
}

// ── ID del boletín activo (temporal, hardcode) ────────────────────────
// TODO: convertir en parámetro dinámico cuando haya pantalla de selección
export const BULLETIN_ID_HARDCODE = 4

// ── Instancia Axios con configuración base ────────────────────────────
// axios.create() crea un objeto con headers y URL predeterminados.
// Cada llamada de este archivo usa esta instancia (llamada 'api').
// Equivalente en Java a un HttpClient preconfigurado con base URL y headers.
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 segundos máximo. Si el servidor no responde, se cancela.
  headers: {
    'Content-Type':  'application/json',
    // Authorization: estándar JWT para APIs REST.
    // El servidor valida este token en cada request.
    // "Bearer" es el tipo de autenticación — indica que el token es un JWT.
    'Authorization': `Bearer ${TOKEN}`,
  },
})

// ── Interceptor de REQUEST ────────────────────────────────────────────
// Se ejecuta ANTES de enviar cada llamada a la API.
// Solo activo en desarrollo (import.meta.env.DEV).
// Muestra en consola el método, URL y body que se envía.
//
// console.group() crea un bloque colapsable en DevTools (F12 → Console).
// Útil porque los JSON pueden ser muy largos.
api.interceptors.request.use(
  config => {
    if (import.meta.env.DEV) {
      const m = (config.method || 'REQUEST').toUpperCase()
      const u = config.url || '?'
      console.group(`[API ➤] ${m} ${BASE_URL}${u}`)
      if (config.params) console.log('  Query params:', config.params)
      if (config.data) {
        let body = config.data
        // config.data puede ser string JSON (Axios lo serializa automáticamente)
        if (typeof body === 'string') {
          try { body = JSON.parse(body) } catch(e) { /* no era JSON */ }
        }
        console.log('  Body ENVIADO:', body)
        console.log('  Body JSON:', JSON.stringify(body, null, 2))
      }
      console.groupEnd()
    }
    // SIEMPRE retornar config — si no, el request no se envía
    return config
  },
  err => Promise.reject(err)
)

// ── Interceptor de RESPONSE ───────────────────────────────────────────
// Se ejecuta DESPUÉS de cada respuesta.
// Caso exitoso (2xx): loguea los datos recibidos.
// Caso error (4xx/5xx/red): loguea el error con detalles útiles.
api.interceptors.response.use(

  // Respuesta exitosa (status 200-299)
  res => {
    if (import.meta.env.DEV) {
      const m = (res.config?.method || 'REQUEST').toUpperCase()
      const u = res.config?.url || '?'
      console.group(`[API ✅] ${res.status} ${m} ${u}`)
      console.log('  Status:', res.status, res.statusText)
      console.log('  Datos recibidos:', res.data)
      console.log('  Datos JSON:', JSON.stringify(res.data, null, 2))
      console.groupEnd()
    }
    // SIEMPRE retornar res para que el código llamador reciba los datos
    return res
  },

  // Respuesta con error
  err => {
    const status    = err.response?.status
    const serverMsg = err.response?.data?.message || err.response?.data?.error || null
    const m         = (err.config?.method || 'REQUEST').toUpperCase()
    const u         = err.config?.url || '?'

    if (import.meta.env.DEV) {
      const lbl = status ? String(status) : 'SIN CONEXION'
      console.group(`[API ❌] ${lbl} ${m} ${u}`)
      if (err.config?.data) {
        let body = err.config.data
        if (typeof body === 'string') { try { body = JSON.parse(body) } catch(e) {} }
        console.log('  Body que se intentó enviar:', body)
      }
      if (err.response?.data) {
        console.log('  Respuesta del servidor:', err.response.data)
      }
      console.groupEnd()
    }

    // Mensajes siempre visibles (desarrollo y producción)
    if      (status === 401) console.error(`[API 401] Token inválido o expirado. Actualiza VITE_API_TOKEN en .env → ${m} ${u}`)
    else if (status === 403) console.error(`[API 403] Sin permisos → ${m} ${u}`)
    else if (status === 404) console.error(`[API 404] Ruta no encontrada → ${m} ${u}`)
    else if (status >= 500)  console.error(`[API ${status}] Error del servidor:`, serverMsg)
    else if (!err.response)  console.error(`[API RED] Sin conexión. Verifica que el servidor corra en ${BASE_URL}`)
    else                     console.error(`[API ${status}]`, serverMsg)

    // Re-lanzar para que el código llamador lo capture con try/catch
    return Promise.reject(err)
  }
)

// ═══════════════════════════════════════════════════════════════════════
// FUNCIONES PÚBLICAS
// Una por cada endpoint de la API. Cada componente importa solo las que necesita.
// ═══════════════════════════════════════════════════════════════════════

// ── guardarImagenFisica ────────────────────────────────────────────────
// POST /__upload  (endpoint del servidor Vite, NO de la API de producción)
//
// El browser no puede escribir archivos en disco por razones de seguridad.
// Este endpoint especial de Vite hace esa escritura en el servidor Node.js.
// Guarda en: public/assets/section_images/{bull_id}/{filename}
//
// Parámetros:
//   file   → objeto File del browser (del <input type="file">)
//   bullId → ID del boletín (para crear la subcarpeta)
// Retorna: { ok: true, url: "/assets/section_images/4/logo.png", filename, path }
export async function guardarImagenFisica(file, bullId) {
  const ext        = file.name.split('.').pop().toLowerCase() || 'jpg'
  const nombreBase = file.name.replace(/\.[^/.]+$/, '')
  const fecha      = getSufijoDeFecha()
  const filename   = `secimg_${nombreBase}_${bullId}${fecha}.${ext}`

  // FormData: formato para enviar archivos por HTTP (multipart/form-data)
  // Es lo mismo que hace un <form enctype="multipart/form-data"> en HTML
  const form = new FormData()
  form.append('image',    file, filename)
  form.append('filename', filename)
  form.append('bull_id',  String(bullId))

  // fetch() nativo aquí porque FormData no necesita Content-Type de Axios
  // (el browser lo pone automáticamente con el "boundary" correcto)
  // NO se agrega Authorization aquí — /__upload es el servidor Vite local
  const res = await fetch('/__upload', { method: 'POST', body: form })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(`Error al guardar imagen: ${errData.error}`)
  }
  return await res.json()
}

// Genera un sufijo de fecha: _20260429_143055
function getSufijoDeFecha() {
  const n = new Date()
  const p = x => String(x).padStart(2, '0')
  return `_${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`
}

export function generarNombreImagen(file, bulletinId) {
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const base = file.name.replace(/\.[^/.]+$/, '')
  return `secimg_${base}_${bulletinId}${getSufijoDeFecha()}.${ext}`
}

// ── registrarRecursos ──────────────────────────────────────────────────
// POST /bulletin-resources
// Registra imágenes, URLs y correos en bulletin_resource.
// Parámetro: [{ resource_desc: "url_o_nombre" }, ...]
// Retorna:   { success: true, inserted_ids: [50, 51] }
export async function registrarRecursos(recursos) {
  const res = await api.post('/bulletin-resources', recursos)
  return res.data
}

// ── guardarSeccionesBatch ──────────────────────────────────────────────
// POST /bulletin/sections/batch
// Crea secciones NUEVAS en la BD (las que NO tienen section_id).
// Body enviado: { "data": [ {...seccion sin section_id...}, ... ] }
export async function guardarSeccionesBatch(secciones) {
  const res = await api.post('/bulletin/sections/batch', { data: secciones })
  return res.data
}

// ── actualizarSeccionesBatch ───────────────────────────────────────────
// PATCH /bulletin-sections
// Actualiza secciones que YA EXISTEN en la BD (las que tienen section_id).
// Body enviado: { "sections": [ { "section_id": 123, ...campos }, ... ] }
// Retorna: { message: "Actualización exitosa. Filas afectadas: N", rows_affected: N }
//
// ¿Cómo sé qué secciones tienen section_id?
//   Cuando se carga un boletín para editar (GET /bulletin/sections/{id}),
//   apiToBuilder.js guarda el section_id de la BD en elem._bdId.
//   Luego buildJson.js lo copia al campo _bdId del JSON plano.
//   useGuardarBoletin.js revisa si _bdId existe para decidir PATCH o POST.
export async function actualizarSeccionesBatch(secciones) {
  // Si se pasa un objeto individual por error, convertirlo a array
  const arr = Array.isArray(secciones) ? secciones : [secciones]
  const res = await api.patch('/bulletin-sections', { sections: arr })
  return res.data
}

// ── darDeBajaSeccion ───────────────────────────────────────────────────
// PATCH /bulletin-sections con section_status: false
//
// "Baja lógica" (soft delete): en lugar de borrar el registro de la BD,
// se desactiva con section_status = false. Ventajas:
//   - Se puede restaurar después
//   - Se mantiene el historial para auditoría
//   - Estándar en sistemas gubernamentales
//
// Parámetro bdData: objeto con todos los campos de la sección de la BD
export async function darDeBajaSeccion(bdData, updatedBy = 'SISTEMA') {
  const res = await api.patch('/bulletin-sections', {
    sections: [{
      section_id:             bdData.section_id,
      section_segment:        bdData.section_segment,
      section_subsegment:     bdData.section_subsegment,
      section_subsegment_num: bdData.section_subsegment_num || 0,
      bull_id:                bdData.bull_id,
      resource_id:            bdData.resource_id || null,
      section_order:          bdData.section_order,
      section_content:        bdData.section_content  || '',
      section_format:         bdData.section_format   || '',
      section_css:            bdData.section_css      || '',
      section_htmltag:        bdData.section_htmltag  || 'div',
      section_status:         false,    // ← la "baja lógica"
      updated_by:             updatedBy,
    }]
  })
  return res.data
}

// ── obtenerSecciones ───────────────────────────────────────────────────
// GET /bulletin/sections/{bulletinId}
// Retorna las secciones de un boletín. Si no tiene, el servidor da 404.
export async function obtenerSecciones(bulletinId) {
  const res = await api.get(`/bulletin/sections/${bulletinId}`)
  return res.data
}

// Funciones de compatibilidad (mantener para no romper imports existentes)
export async function guardarBoletin(flatJson) {
  return guardarSeccionesBatch(flatJson?.bulletin_sections || [])
}
export async function actualizarBoletin(bulletinId, flatJson) {
  const res = await api.put(`/bulletins/${bulletinId}`, flatJson)
  return res.data
}
export async function obtenerBoletin(bulletinId) {
  const res = await api.get(`/bulletins/${bulletinId}`)
  return res.data
}
