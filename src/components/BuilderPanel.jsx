// ─────────────────────────────────────────────────────────────────────────
// BuilderPanel.jsx
// ─────────────────────────────────────────────────────────────────────────
//
// CORRECCIONES:
//
//   1. Lógica de URL en buildJson — CRÍTICO:
//      REGLA de negocio para URLs:
//        - resource_desc (bulletin_resource) → SIEMPRE la URL real
//        - section_content (bulletin_sections) → el anchorText si existe y está activo,
//          si no, la URL real
//
//      ANTES (incorrecto):
//        path_desc = elem.contenido  ← la URL iba a resource_desc ✓
//        section_content = elem.anchorText  ← el texto visible iba a section_content ✓
//        PERO: si anchorText estaba vacío o el check desactivado,
//              section_content quedaba '' en lugar de la URL.
//
//      AHORA (correcto):
//        path_desc = elem.contenido  (URL real → resource_desc, SIEMPRE)
//        section_content = (anchorText activo y no vacío) ? anchorText : elem.contenido
//
//   2. section_subsegment_num CORREGIDO:
//      ANTES: section_subsegment_num = section_subsegment (el número de columna)
//      AHORA: section_subsegment_num = total de columnas del segmento
//             'full' → 0, 'half' → 2, 'thirds' → 3
//
// ─────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Section from './Section'
import styles  from './BuilderPanel.module.css'
import { findType } from './editor/elementTypes'
import { buildCss  } from '../utils/cssTokens'

// ── buildJson ──────────────────────────────────────────────────────────
// Convierte el estado anidado del builder al JSON plano para la API.
// Es una función pura: dado el mismo estado, produce el mismo JSON.
function buildJson(secciones) {
  const sections = []
  let order = 1

  secciones.forEach((sec, si) => {
    const segN    = si + 1
    const segName = sec.nombre || `SEG-${segN}`
    const layout  = sec.layout || 'full'

    // Cuántas columnas tiene este segmento en total
    // 'full' → 0 (sin columnas), 'half' → 2, 'thirds' → 3
    const subsegmentNum =
      layout === 'half'   ? 2 :
      layout === 'thirds' ? 3 : 0

    const makeRow = (elem, subN, subName) => {
      const info = findType(elem.tipo)
      let path_id = null, path_desc = null

      if (elem.tipo === 'url' && elem.contenido) {
        path_id   = 0
        // resource_desc SIEMPRE es la URL real (para bulletin_resource)
        path_desc = elem.contenido
      }
      if (elem.tipo === 'mail' && elem.contenido) {
        path_id   = 0
        path_desc = elem.contenido  // la dirección de email va en resource_desc
      }
      if (elem.tipo === 'img' && elem.contenido) {
        path_id   = 0
        path_desc = elem.contenido
      }

      const cssClases = buildCss(elem.tipo, elem.align || info.defAlign || 'left', elem.font || '')

      // ── LÓGICA CORREGIDA PARA section_content de URL ────────────────
      // anchorText = texto visible del link (opcional)
      // mostrarAnchor = si el check "Texto visible" está activado
      //
      // Regla:
      //   - Si el usuario activó el check Y escribió un anchorText → usar anchorText
      //   - Si el check está desactivado O el texto está vacío → usar la URL
      //
      // Esta regla aplica a section_content.
      // resource_desc (path_desc) SIEMPRE es la URL real, sin excepción.
      const anchorActivo  = elem.anchorText && elem.anchorText.trim() !== ''
      const sectionContent =
        (elem.tipo === 'url' && anchorActivo)
          ? elem.anchorText.trim()   // texto visible del link
          : (elem.contenido || '')   // URL real (o cualquier otro contenido)

      return {
        section_order:          order++,
        section_segment:        segN,
        section_subsegment:     subN,
        section_subsegment_num: subsegmentNum,  // ← CORREGIDO (antes era subN)
        seg_name:               segName,
        sub_name:               subN > 0 ? (subName || `Columna ${subN}`) : null,
        type:                   elem.tipo,
        align:                  elem.align || info.defAlign || '',
        section_css:            cssClases,
        section_html:           elem.html  || info.htmlTag || 'div',
        section_content:        sectionContent,
        path_id,
        path_desc,
        _meta_type:             elem.tipo,
        _meta_align:            elem.align || info.defAlign || '',
        _meta_seg_name:         segName,
        _meta_sub_name:         subN > 0 ? (subName || `Columna ${subN}`) : null,
        // _bdId: si el elemento vino de la BD (fue cargado para editar),
        // guarda el section_id original. useGuardarBoletin lo usa para
        // saber si hacer PATCH (actualizar) o POST (crear nuevo).
        _bdId:                  elem._bdId || null,
        _bdResourceId:          elem._bdResourceId || null,
      }
    }

    if (layout === 'full') {
      ;(sec.elementos || []).forEach(e => sections.push(makeRow(e, 0, null)))
    } else {
      ;(sec.subsegmentos || []).forEach((sub, si2) => {
        const subN = si2 + 1
        ;(sub.elementos || []).forEach(e => sections.push(makeRow(e, subN, sub.nombre)))
      })
    }
  })

  return {
    bulletin: { bull_name: 'Documento', bull_status: true, updated_by: 'SISTEMA' },
    bulletin_sections: sections.map(s => ({
      section_segment:        s.section_segment,
      section_subsegment:     s.section_subsegment,
      section_subsegment_num: s.section_subsegment_num,
      bull_id:                null,  // se inyecta en App.jsx / EditorBoletín antes de llamar guardar()
      path_id:                s.path_id,
      section_content:        s.section_content,
      section_css:            s.section_css,
      section_html:           s.section_html,
      section_order:          s.section_order,
      section_status:         true,
      updated_by:             'SISTEMA',
      _meta_seg_name:         s._meta_seg_name,
      _meta_sub_name:         s._meta_sub_name,
      _meta_type:             s._meta_type,
      _meta_align:            s._meta_align,
      _bdId:                  s._bdId,
      _bdResourceId:          s._bdResourceId,
    })),
    bulletin_path: sections
      .filter(s => s.path_id !== null)
      .map(s => ({ path_id: null, path_desc: s.path_desc })),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// BuilderPanel — componente principal del editor
// ─────────────────────────────────────────────────────────────────────────
const BuilderPanel = forwardRef(function BuilderPanel({
  seccionesExternas,
  onSeccionesChange,
  activeSectionIdExterno,
  onActiveSectionChange,
  activeSubIdExterno,
  onActiveSubChange,
  activeElemIdExterno,
  onActiveElemChange,
  onElementoAbierto,
}, ref) {

  const [seccionesLocales, setSeccionesLocales] = useState([])
  const secciones    = seccionesExternas  !== undefined ? seccionesExternas  : seccionesLocales
  const setSecciones = onSeccionesChange  !== undefined ? onSeccionesChange  : setSeccionesLocales

  const [activeSection, setActiveSection] = useState(null)
  const prevSecRef  = useRef(null)
  const prevSubRef  = useRef(null)
  const prevElemRef = useRef(null)

  const archivosImagenRef = useRef({})

  // ── Sincronizar navegación desde el preview ───────────────────────
  useEffect(() => {
    if (activeSectionIdExterno && activeSectionIdExterno !== prevSecRef.current) {
      prevSecRef.current = activeSectionIdExterno
      setActiveSection(activeSectionIdExterno)
      const el = document.getElementById(`seccion-${activeSectionIdExterno}`)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [activeSectionIdExterno])

  useEffect(() => {
    if (activeSubIdExterno && activeSubIdExterno !== prevSubRef.current) {
      prevSubRef.current = activeSubIdExterno
    }
  }, [activeSubIdExterno])

  useEffect(() => {
    if (activeElemIdExterno && activeElemIdExterno !== prevElemRef.current) {
      prevElemRef.current = activeElemIdExterno
    }
  }, [activeElemIdExterno])

  const handleFileSelected = useCallback((elemId, file) => {
    archivosImagenRef.current[elemId] = file
  }, [])

  const toggleSec = id => setActiveSection(p => p === id ? null : id)

  const agregarSeccion = useCallback(() => {
    setSecciones(prev => {
      const n = {
        id:           `sec_${crypto.randomUUID()}`,
        nombre:       '',
        cssClases:    'doc-section',
        layout:       'full',
        elementos:    [],
        subsegmentos: [],
      }
      setActiveSection(n.id)
      return [...prev, n]
    })
  }, [setSecciones])

  const actualizarSeccion = (secId, datos) =>
    setSecciones(prev => prev.map(s => s.id === secId ? datos : s))

  const eliminarSeccion = secId => {
    setSecciones(prev => prev.filter(s => s.id !== secId))
    setActiveSection(p => p === secId ? null : p)
  }

  const moverSeccion = (idx, dir) => {
    const dest = idx + dir
    if (dest < 0 || dest >= secciones.length) return
    setSecciones(prev => {
      const a = [...prev]; [a[idx], a[dest]] = [a[dest], a[idx]]; return a
    })
  }

  useImperativeHandle(ref, () => ({
    agregarSeccion,
    buildJsonActual: () => secciones.length ? buildJson(secciones) : null,
    getImagenes:     () => archivosImagenRef.current,
  }), [agregarSeccion, secciones])

  return (
    <div className={styles.panel}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.topbarLogo}>📄</span>
          <span className={styles.topbarTitulo}>Builder de Boletines</span>
          <span className={styles.topbarBadge}>React + Vite</span>
        </div>
      </div>

      <div className={styles.contenido}>
        <div className={styles.seccionesList}>
          {secciones.length === 0
            ? (
              <div className={styles.listaVacia}>
                <div className={styles.listaVaciaIco}>📋</div>
                <p>Usa el botón <strong>+</strong> flotante para agregar la primera sección.</p>
              </div>
            )
            : secciones.map((sec, idx) => (
              <Section
                key={sec.id}
                section={sec}
                sectionIndex={idx}
                isOpen={activeSection === sec.id}
                onToggle={() => toggleSec(sec.id)}
                onMoverSec={dir => moverSeccion(idx, dir)}
                canSecArriba={idx > 0}
                canSecAbajo={idx < secciones.length - 1}
                onUpdate={actualizarSeccion}
                onDelete={eliminarSeccion}
                onFileSelected={handleFileSelected}
                activeSubIdExterno={activeSection === sec.id ? activeSubIdExterno : null}
                onActiveSubChange={onActiveSubChange}
                activeElemIdExterno={activeSection === sec.id ? activeElemIdExterno : null}
                onActiveElemChange={onActiveElemChange}
                onElementoAbierto={onElementoAbierto}
              />
            ))
          }
        </div>
      </div>
    </div>
  )
})

export default BuilderPanel
