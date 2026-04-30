// ─────────────────────────────────────────────────────────────────────────
// App.jsx — Componente raíz
// ─────────────────────────────────────────────────────────────────────────
//
// CAMBIOS EN ESTA VERSIÓN:
//
//   1. Input para el Bulletin ID (quita BULLETIN_ID_HARDCODE)
//      Antes: el bull_id siempre era 4 (hardcodeado en api.js).
//      Ahora: el usuario escribe el bull_id antes de crear el documento.
//      Ese número se pasa al hook guardar() y a cada sección al guardar.
//
//   2. panelMovil — toggle de panel en móvil
//      En pantallas <= 768px solo se muestra un panel a la vez.
//      El botón "Preview/Builder" del toolbar permite cambiar entre ellos.
//
//   3. El bull_id se muestra en la barra superior cuando el usuario
//      lo ha ingresado, para que siempre sepa sobre qué documento trabaja.
//
// ─────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react'
import BuilderPanel    from './components/BuilderPanel'
import PreviewPanel    from './components/PreviewPanel'
import FloatingToolbar from './components/FloatingToolbar'
import ErrorBoundary   from './components/ErrorBoundary'
import VisorDocumento  from './components/VisorDocumento'
import EditorBoletín   from './components/EditorBoletín'
import { useGuardarBoletin } from './hooks/useGuardarBoletin'
import './App.css'

function getSufijoDeFecha() {
  const n = new Date(); const p = x => String(x).padStart(2, '0')
  return `_${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`
}
function descargarJson(datos, nombre = 'boletin') {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = `${nombre}${getSufijoDeFecha()}.json`
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

export default function App() {
  // ── Pantalla activa ────────────────────────────────────────────────
  const [pantalla,   setPantalla]   = useState('builder') // 'builder' | 'visor' | 'editor'

  // ── Bull ID dinámico ───────────────────────────────────────────────
  // El usuario ingresa el ID antes de crear el documento.
  // Se usa como bull_id en bulletin_sections al guardar.
  // '' = no ingresado aún (el builder funciona igual, solo que no puede guardar)
  const [bullId,     setBullId]     = useState('')
  const [bullIdInput, setBullIdInput] = useState('') // lo que escribe el usuario

  // ── Panel activo en móvil ─────────────────────────────────────────
  // 'builder' | 'preview'. En desktop no tiene efecto visual.
  const [panelMovil, setPanelMovil] = useState('builder')

  // ── Estado del builder ────────────────────────────────────────────
  const [secciones,       setSecciones]       = useState([])
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [activeSubId,     setActiveSubId]     = useState(null)
  const [activeElemId,    setActiveElemId]    = useState(null)
  const [previewScrollId, setPreviewScrollId] = useState(null)

  // ── Estado de guardado ────────────────────────────────────────────
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)
  const [errorGuardado,   setErrorGuardado]   = useState('')

  const builderRef = useRef(null)
  const { guardar, cargando } = useGuardarBoletin()

  // ── Handlers del builder/preview ─────────────────────────────────
  const handleNavegar = useCallback(({ tipo, id, secId, subId }) => {
    if (tipo === 'elemento') {
      setActiveSectionId(secId || null); setActiveSubId(subId || null); setActiveElemId(id)
    } else if (tipo === 'subsegmento') {
      setActiveSectionId(secId); setActiveSubId(id); setActiveElemId(null)
    } else {
      setActiveSectionId(id); setActiveSubId(null); setActiveElemId(null)
    }
  }, [])

  const handleElementoAbierto = useCallback((elemId) => {
    setPreviewScrollId(elemId)
    setTimeout(() => setPreviewScrollId(null), 400)
  }, [])

  const handleSeccionesChange = useCallback((fn) => setSecciones(fn), [])
  const handleAgregarSeccion  = useCallback(() => { builderRef.current?.agregarSeccion?.() }, [])

  // ── Guardar ───────────────────────────────────────────────────────
  const handleGuardar = useCallback(async () => {
    // Validar que el usuario haya ingresado un bull_id
    const idNum = parseInt(bullId, 10)
    if (!idNum || idNum <= 0) {
      setErrorGuardado('⚠ Ingresa el número del boletín (ID) antes de guardar.')
      return
    }

    const flat     = builderRef.current?.buildJsonActual?.()
    const imagenes = builderRef.current?.getImagenes?.() || {}
    if (!flat) return

    setGuardadoExitoso(false)
    setErrorGuardado('')

    try {
      // Inyectar el bull_id del usuario en cada sección antes de guardar
      // (buildJson pone bull_id: null porque no sabe el ID en ese momento)
      if (flat.bulletin_sections) {
        flat.bulletin_sections = flat.bulletin_sections.map(s => ({ ...s, bull_id: idNum }))
      }

      await guardar(flat, imagenes, idNum)
      setGuardadoExitoso(true)
      setSecciones([])
      setTimeout(() => setGuardadoExitoso(false), 5000)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error desconocido'
      setErrorGuardado(`Hubo un problema al guardar. (${msg})`)
      console.error('[GUARDAR] Error completo:', err)
    }
  }, [guardar, bullId])

  const handleDescargar = useCallback(() => {
    const flat = builderRef.current?.buildJsonActual?.()
    if (flat) descargarJson(flat, `boletin_${bullId || 'sin_id'}`)
  }, [bullId])

  // ── Pantallas alternativas ────────────────────────────────────────
  if (pantalla === 'visor')  return <VisorDocumento onVolver={() => setPantalla('builder')} />
  if (pantalla === 'editor') return <EditorBoletín  onVolver={() => setPantalla('builder')} />

  return (
    <div className="app-layout">

      {/* ── Notificaciones ────────────────────────────────────────── */}
      {guardadoExitoso && (
        <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'#1e5b4f', color:'#fff', padding:'12px 20px', borderRadius:'10px', fontSize:'14px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 6px 24px rgba(0,0,0,.25)', maxWidth:'min(560px,92vw)', width:'fit-content', boxSizing:'border-box' }}>
          <span style={{ fontSize:'22px' }}>✅</span>
          Boletín #{bullId} guardado. El builder está listo para un nuevo documento.
          <button onClick={() => setGuardadoExitoso(false)} style={{ marginLeft:'10px', background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'18px' }}>✕</button>
        </div>
      )}
      {errorGuardado && (
        <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'#8b2020', color:'#fff', padding:'12px 20px', borderRadius:'10px', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 6px 24px rgba(0,0,0,.25)', maxWidth:'min(560px,92vw)', width:'fit-content', boxSizing:'border-box' }}>
          <span style={{ fontSize:'22px' }}>⚠</span>
          {errorGuardado}
          <button onClick={() => setErrorGuardado('')} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'18px' }}>✕</button>
        </div>
      )}

      {/* ── Panel builder ─────────────────────────────────────────── */}
      <div className={`app-builder${panelMovil !== 'builder' ? ' panel-oculto-movil' : ''}`}>
        <ErrorBoundary>
          {/* ── Banner de Bull ID ─────────────────────────────────────
              Barra en la parte superior del builder para ingresar
              el número del boletín al que pertenece este documento.
              Es la solución para quitar el BULLETIN_ID_HARDCODE.
              El usuario siempre sabe para qué boletín está trabajando. */}
          <div style={{
            background: bullId ? '#1e5b4f' : '#611232',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'background .3s',
            flexWrap: 'wrap',
          }}>
            <span style={{ color: '#e6d194', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' }}>
              📋 Boletín ID:
            </span>

            {/* Input para el bull_id */}
            <input
              type="number"
              min="1"
              value={bullIdInput}
              onChange={e => setBullIdInput(e.target.value)}
              onBlur={() => {
                // Al salir del campo, confirmar el valor
                const v = parseInt(bullIdInput, 10)
                if (v > 0) setBullId(String(v))
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = parseInt(bullIdInput, 10)
                  if (v > 0) setBullId(String(v))
                  e.target.blur()
                }
              }}
              placeholder="Ej: 5"
              style={{
                width: '80px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1.5px solid rgba(230,209,148,.5)',
                background: 'rgba(0,0,0,.2)',
                color: '#e6d194',
                fontSize: '13px',
                fontFamily: 'inherit',
                fontWeight: 700,
                outline: 'none',
              }}
            />

            {bullId
              ? <span style={{ color: '#a6e3a1', fontSize: '11px', fontWeight: 700 }}>
                  ✓ ID confirmado: #{bullId}
                </span>
              : <span style={{ color: 'rgba(230,209,148,.6)', fontSize: '11px' }}>
                  Ingresa el ID y presiona Enter antes de guardar
                </span>
            }
          </div>

          <BuilderPanel
            ref={builderRef}
            seccionesExternas={secciones}
            onSeccionesChange={handleSeccionesChange}
            activeSectionIdExterno={activeSectionId}
            onActiveSectionChange={setActiveSectionId}
            activeSubIdExterno={activeSubId}
            onActiveSubChange={setActiveSubId}
            activeElemIdExterno={activeElemId}
            onActiveElemChange={setActiveElemId}
            onElementoAbierto={handleElementoAbierto}
          />
        </ErrorBoundary>
      </div>

      {/* ── Toolbar flotante ──────────────────────────────────────── */}
      <FloatingToolbar
        onAgregarSeccion={handleAgregarSeccion}
        onGuardar={handleGuardar}
        onDescargar={handleDescargar}
        onVerDocumento={() => setPantalla('visor')}
        onEditarDocumento={() => setPantalla('editor')}
        cargando={cargando}
        totalSecciones={secciones.length}
        panelMovil={panelMovil}
        onTogglePanelMovil={() => setPanelMovil(p => p === 'builder' ? 'preview' : 'builder')}
      />

      {/* ── Panel preview ─────────────────────────────────────────── */}
      <div className={`app-preview${panelMovil !== 'preview' ? ' panel-oculto-movil' : ''}`}>
        <ErrorBoundary>
          <PreviewPanel
            secciones={secciones}
            onNavegar={handleNavegar}
            activeElemIdFromBuilder={previewScrollId}
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
