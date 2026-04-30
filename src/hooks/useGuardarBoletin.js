// ─────────────────────────────────────────────────────────────────────────
// hooks/useGuardarBoletin.js
// ─────────────────────────────────────────────────────────────────────────
//
// CAMBIO PRINCIPAL: bullId dinámico
//   Antes: usaba BULLETIN_ID_HARDCODE = 4 (siempre el mismo boletín)
//   Ahora: guardar(flatJson, imagenesArchivos, bullId) recibe el ID
//          como tercer parámetro. Si no se pasa, lanza un error claro.
//
//   ¿Por qué pasar bullId aquí Y en las secciones desde App.jsx?
//   - App.jsx inyecta bull_id en cada sección (para la BD)
//   - Este hook usa bullId para la carpeta de imágenes (POST /__upload)
//   Los dos son necesarios: la carpeta de disco y el campo de la BD son
//   usos distintos del mismo ID.
//
// LÓGICA PATCH vs POST (igual que antes):
//   Secciones CON section_id → PATCH /bulletin-sections
//   Secciones SIN section_id → POST  /bulletin/sections/batch
//
// ─────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import {
  registrarRecursos,
  guardarSeccionesBatch,
  actualizarSeccionesBatch,
  guardarImagenFisica,
} from '../services/api'
import { encodeHtml, sanitizePlain } from '../utils/htmlTokens'
import { buildCss, encodeCssToIndex } from '../utils/cssTokens'
import { devLog, devLogGroup, devSeparator } from '../utils/devLog'

const RICH_TYPES        = ['p', 'ul', 'ol', 'ul-ol', 'hl', 'note']
const PLAIN_TYPES       = ['h1', 'h2', 'h3']
const TIPOS_CON_RECURSO = ['img', 'url', 'mail']

const HTML_TAG_MAP = {
  h1: 'h1', h2: 'h2', h3: 'h3', p: 'p',
  ul: 'ul', ol: 'ol', 'ul-ol': 'ul',
  hl:   'div',
  note: 'blockquote',
  hr:   'hr',
  url:  'a',
  mail: 'a',
  img:  'img',
}

// ── procesarSeccion ────────────────────────────────────────────────────
// Convierte una sección del buildJson al formato de la BD.
// Si sec._bdId existe → incluye section_id → va al PATCH
// Si no → no incluye section_id → va al POST
function procesarSeccion(sec, resourceId, urlImagen = null) {
  const tipo  = sec._meta_type  || ''
  const align = sec._meta_align || 'left'

  const htmlCrudo = sec.section_html || ''
  let   htmlToken = ''
  if      (PLAIN_TYPES.includes(tipo)) htmlToken = sanitizePlain(htmlCrudo)
  else if (RICH_TYPES.includes(tipo))  htmlToken = encodeHtml(htmlCrudo)
  else                                 htmlToken = htmlCrudo

  if (RICH_TYPES.includes(tipo) || PLAIN_TYPES.includes(tipo)) {
    devLogGroup('TOKEN', `SEG=${sec.section_segment} tipo=${tipo}`, [
      { label: 'HTML crudo', valor: htmlCrudo },
      { label: 'Tokens',     valor: htmlToken  },
    ])
  }

  const cssClases  = buildCss(tipo, align, '')
  const cssIndices = encodeCssToIndex(cssClases)
  const htmlTag    = HTML_TAG_MAP[tipo] || 'div'

  // El spread condicional incluye section_id solo si _bdId existe
  // Esto es lo que separa PATCH (existente) de POST (nuevo)
  return {
    ...(sec._bdId ? { section_id: sec._bdId } : {}),
    section_segment:        sec.section_segment,
    section_subsegment:     sec.section_subsegment,
    section_subsegment_num: sec.section_subsegment_num || 0,
    bull_id:                sec.bull_id,  // ya viene inyectado desde App.jsx o EditorBoletín
    resource_id:            resourceId || null,
    section_order:          sec.section_order,
    section_content:        (tipo === 'img' && urlImagen) ? urlImagen : (sec.section_content || ''),
    section_format:         htmlToken,
    section_css:            cssIndices,
    section_htmltag:        htmlTag,
    section_status:         true,
    updated_by:             'milla',
    _temp_format_crudo:     htmlCrudo,
    _temp_css_clases:       cssClases,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// useGuardarBoletin
// ─────────────────────────────────────────────────────────────────────────
export function useGuardarBoletin() {
  const [cargando,  setCargando]  = useState(false)
  const [error,     setError]     = useState(null)
  const [resultado, setResultado] = useState(null)

  // guardar(flatJson, imagenesArchivos, bullId)
  //   flatJson          → JSON del builder (bulletin_sections con bull_id ya inyectado)
  //   imagenesArchivos  → mapa { nombre_archivo: objeto_File }
  //   bullId            → ID del boletín (para la carpeta de imágenes en disco)
  const guardar = useCallback(async (flatJson, imagenesArchivos = {}, bullId) => {
    setCargando(true)
    setError(null)
    setResultado(null)

    // Validar que se pase un bullId numérico válido
    const idNum = parseInt(bullId, 10)
    if (!idNum || idNum <= 0) {
      const msg = 'Debes ingresar el ID del boletín antes de guardar.'
      setError(msg)
      setCargando(false)
      throw new Error(msg)
    }

    try {
      const secciones = flatJson?.bulletin_sections || []
      if (secciones.length === 0) {
        throw new Error('No hay secciones para guardar. Agrega al menos un elemento.')
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 1: Imágenes físicas + registrar recursos
      // ═══════════════════════════════════════════════════════════════
      devSeparator('PASO 1 — Imágenes + Recursos')

      const seccionesConRecurso = secciones.filter(sec =>
        TIPOS_CON_RECURSO.includes(sec._meta_type) && sec.section_content
      )
      devLog('GUARD', `Secciones con recurso: ${seccionesConRecurso.length}`)

      const urlImagenPorClave = {}

      for (const sec of seccionesConRecurso) {
        if (sec._meta_type === 'img') {
          const archivo = imagenesArchivos[sec.section_content]
          if (archivo) {
            try {
              // guardarImagenFisica usa el bullId para crear la carpeta correcta
              const info  = await guardarImagenFisica(archivo, idNum)
              const clave = `${sec.section_segment}_${sec.section_subsegment}_${sec.section_order}`
              urlImagenPorClave[clave] = info.url
              devLog('IMG', `Imagen guardada: ${info.filename} → ${info.url}`)
            } catch (imgErr) {
              devLog('IMG', `No se pudo guardar ${sec.section_content}: ${imgErr.message}`)
              console.warn('[GUARD] Imagen omitida:', sec.section_content, imgErr.message)
            }
          }
        }
      }

      const recursosParaRegistrar = seccionesConRecurso.map(sec => {
        const clave = `${sec.section_segment}_${sec.section_subsegment}_${sec.section_order}`
        if (sec._meta_type === 'img') {
          return { resource_desc: urlImagenPorClave[clave] || sec.section_content }
        }
        // URL y MAIL: resource_desc SIEMPRE es la URL real
        // section_content puede ser el anchorText, pero resource_desc es la URL
        return { resource_desc: sec.section_content }
      })

      devLog('GUARD', 'Recursos a registrar:', recursosParaRegistrar)

      const resourceIdPorClave = {}
      if (recursosParaRegistrar.length > 0) {
        const respRecursos = await registrarRecursos(recursosParaRegistrar)
        devLog('GUARD', 'resource_ids obtenidos:', respRecursos.inserted_ids)
        seccionesConRecurso.forEach((sec, idx) => {
          const clave = `${sec.section_segment}_${sec.section_subsegment}_${sec.section_order}`
          resourceIdPorClave[clave] = respRecursos.inserted_ids[idx]
        })
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 2: Tokenizar y codificar CSS
      // ═══════════════════════════════════════════════════════════════
      devSeparator('PASO 2 — Tokenizar y codificar')

      const seccionesProcesadas = secciones.map(sec => {
        const clave      = `${sec.section_segment}_${sec.section_subsegment}_${sec.section_order}`
        const resourceId = resourceIdPorClave[clave] || null
        const urlImagen  = sec._meta_type === 'img' ? (urlImagenPorClave[clave] || null) : null
        return procesarSeccion(sec, resourceId, urlImagen)
      })

      // ═══════════════════════════════════════════════════════════════
      // PASO 3: PATCH (existentes) / POST (nuevas)
      // ═══════════════════════════════════════════════════════════════
      devSeparator('PASO 3 — PATCH / POST')

      const seccionesExistentes = seccionesProcesadas.filter(s => !!s.section_id)
      const seccionesNuevas     = seccionesProcesadas.filter(s => !s.section_id)

      devLog('GUARD', `PATCH (con section_id): ${seccionesExistentes.length}`)
      devLog('GUARD', `POST  (sin section_id): ${seccionesNuevas.length}`)
      devLogGroup('GUARD', 'Payloads completos', [
        { label: 'PATCH → { sections: [...] }', valor: { sections: seccionesExistentes } },
        { label: 'POST  → { data: [...] }',     valor: { data: seccionesNuevas } },
      ])

      const resultados = []

      if (seccionesExistentes.length > 0) {
        const respPatch = await actualizarSeccionesBatch(seccionesExistentes)
        resultados.push({ tipo: 'PATCH', respuesta: respPatch })
        devLog('GUARD', 'PATCH completado:', respPatch)
      }

      if (seccionesNuevas.length > 0) {
        const respPost = await guardarSeccionesBatch(seccionesNuevas)
        resultados.push({ tipo: 'POST', respuesta: respPost })
        devLog('GUARD', 'POST completado:', respPost)
      }

      devLog('GUARD', 'Guardado completo:', resultados)
      setResultado(resultados)
      return resultados

    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.error
        || err.message
        || 'Error desconocido al guardar'
      devLog('GUARD', `Error: ${msg}`)
      setError(msg)
      throw err
    } finally {
      setCargando(false)
    }
  }, [])

  const limpiar = useCallback(() => { setError(null); setResultado(null) }, [])

  return { guardar, cargando, error, resultado, limpiar }
}
