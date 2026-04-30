// EditorBoletín.jsx — Pantalla de edición de boletín existente
// ─────────────────────────────────────────────────────────────
// FLUJO:
//   1. El usuario ingresa un Bulletin ID y presiona "Cargar para editar"
//   2. GET /bulletin/sections/{id} → array plano de filas
//   3. apiRowsToSecciones() convierte las filas al estado del builder
//   4. El BuilderPanel recibe las secciones y el usuario las edita
//   5. Al guardar se usan los mismos pasos del builder normal (POST batch)
// ─────────────────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react'
import BuilderPanel    from './BuilderPanel'
import PreviewPanel    from './PreviewPanel'
import FloatingToolbar from './FloatingToolbar'
import ErrorBoundary   from './ErrorBoundary'
import { apiRowsToSecciones } from '../utils/apiToBuilder'
import { useGuardarBoletin }  from '../hooks/useGuardarBoletin'

// TOKEN y BASE_URL vienen del .env a través de api.js
import { TOKEN, BASE_URL } from '../services/api'

function getSufijoDeFecha() {
  const n=new Date(); const p=x=>String(x).padStart(2,'0')
  return `_${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`
}
function descargarJson(datos, nombre='boletin') {
  const blob=new Blob([JSON.stringify(datos,null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob); const a=document.createElement('a')
  a.href=url; a.download=`${nombre}${getSufijoDeFecha()}.json`
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

export default function EditorBoletín({ onVolver }) {
  // ── Estado de la pantalla de carga ────────────────────
  const [bulletinId,    setBulletinId]    = useState('')
  const [cargando,      setCargando]      = useState(false)
  const [errorCarga,    setErrorCarga]    = useState('')
  const [bullIdActual,  setBullIdActual]  = useState(null)
  const [modoEdicion,   setModoEdicion]   = useState(false)  // false=pantalla carga, true=editor

  // ── Estado del builder ────────────────────────────────
  const [secciones,       setSecciones]       = useState([])
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [activeSubId,     setActiveSubId]     = useState(null)
  const [activeElemId,    setActiveElemId]    = useState(null)
  const [previewScrollId, setPreviewScrollId] = useState(null)

  // ── Estado del guardado ───────────────────────────────
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)
  const [errorGuardado,   setErrorGuardado]   = useState('')

  const builderRef = useRef(null)
  const { guardar, cargando: guardando } = useGuardarBoletin()

  // ── CARGAR BOLETÍN DESDE EL API ───────────────────────
  const cargarBoletin = useCallback(async () => {
    const id = parseInt(bulletinId, 10)
    if (!id || id <= 0) {
      setErrorCarga('Ingresa un número de boletín válido.')
      return
    }
    setCargando(true); setErrorCarga('')

    try {
      console.log(`[EDITOR] Cargando boletín ${id}...`)
      const res = await fetch(`${BASE_URL}/bulletin/sections/${id}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'accept': '*/*' }
      })

      if (!res.ok) {
        if (res.status === 404) throw new Error(`No se encontró el boletín con ID ${id}.`)
        if (res.status === 401) throw new Error('Sesión expirada. Actualiza el TOKEN.')
        throw new Error(`Error del servidor: ${res.status}`)
      }

      const data  = await res.json()
      const rows  = Array.isArray(data) ? data : (data.data || [])

      console.log(`[EDITOR] ${rows.length} filas recibidas. Convirtiendo a estado del builder...`)

      // ── CONVERSIÓN CLAVE ──────────────────────────────────────────
      // apiRowsToSecciones transforma el array plano de la BD
      // al estado anidado que necesita el builder (secciones → subsegmentos → elementos)
      const seccionesReconstruidas = apiRowsToSecciones(rows)

      console.log(`[EDITOR] ${seccionesReconstruidas.length} secciones reconstruidas:`, seccionesReconstruidas)

      setSecciones(seccionesReconstruidas)
      setBullIdActual(id)
      setModoEdicion(true)   // mostrar el builder

    } catch (err) {
      setErrorCarga(`No se pudo cargar el boletín. ${err.message}`)
      console.error('[EDITOR] Error:', err)
    } finally {
      setCargando(false)
    }
  }, [bulletinId])

  // ── Navegación bidireccional preview ↔ builder ────────
  const handleNavegar = useCallback(({ tipo, id, secId, subId }) => {
    if      (tipo === 'elemento')    { setActiveSectionId(secId); setActiveSubId(subId||null); setActiveElemId(id) }
    else if (tipo === 'subsegmento') { setActiveSectionId(secId); setActiveSubId(id); setActiveElemId(null) }
    else                             { setActiveSectionId(id);    setActiveSubId(null); setActiveElemId(null) }
  }, [])

  const handleElementoAbierto = useCallback((elemId) => {
    setPreviewScrollId(elemId)
    setTimeout(() => setPreviewScrollId(null), 400)
  }, [])

  const handleSeccionesChange = useCallback((fn) => setSecciones(fn), [])
  const handleAgregarSeccion  = useCallback(() => builderRef.current?.agregarSeccion(), [])

  // ── GUARDAR CAMBIOS ───────────────────────────────────
  const handleGuardar = useCallback(async () => {
    const flat     = builderRef.current?.buildJsonActual?.()
    const imagenes = builderRef.current?.getImagenes?.() || {}
    if (!flat) return
    setGuardadoExitoso(false); setErrorGuardado('')
    try {
      // Inyectar el bullIdActual en cada sección antes de guardar
      // bullIdActual es el ID que el usuario ingresó en el formulario de carga
      if (flat.bulletin_sections) {
        flat.bulletin_sections = flat.bulletin_sections.map(s => ({
          ...s, bull_id: bullIdActual
        }))
      }
      // Pasar bullIdActual como tercer parámetro para la carpeta de imágenes
      await guardar(flat, imagenes, bullIdActual)
      setGuardadoExitoso(true)
      setTimeout(() => setGuardadoExitoso(false), 5000)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error desconocido'
      setErrorGuardado(`Error al guardar. Consulta al administrador. (${msg})`)
      console.error('[EDITOR] Error guardando:', err)
    }
  }, [guardar])

  const handleDescargar = useCallback(() => {
    const flat = builderRef.current?.buildJsonActual?.()
    if (flat) descargarJson(flat, `boletin_${bullIdActual}_edit`)
  }, [bullIdActual])

  // ══════════════════════════════════════════════════════
  // PANTALLA 1 — Búsqueda del boletín a editar
  // ══════════════════════════════════════════════════════
  if (!modoEdicion) {
    return (
      <div style={{ minHeight:'100vh', background:'#f8f6f2', fontFamily:"'Noto Sans',sans-serif", display:'flex', flexDirection:'column' }}>

        {/* Barra de navegación */}
        <div style={{ background:'#611232', height:'52px', display:'flex', alignItems:'center', padding:'0 16px', gap:'12px', boxShadow:'0 3px 14px rgba(97,18,50,.4)', flexShrink:0, overflow:'hidden' }}>
          <button onClick={onVolver} style={{ background:'transparent', border:'1.5px solid rgba(230,209,148,.45)', color:'#e6d194', borderRadius:'7px', padding:'6px 14px', cursor:'pointer', fontSize:'13px', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'6px' }}>
            ← Volver al Builder
          </button>
          <div style={{ width:'1px', height:'24px', background:'rgba(255,255,255,.2)' }}/>
          <span style={{ color:'rgba(255,255,255,.85)', fontSize:'13px', fontWeight:700 }}>
            ✏ Editor de Boletines
          </span>
        </div>

        {/* Formulario de búsqueda */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'clamp(20px, 6vw, 40px) clamp(16px, 5vw, 36px)', maxWidth:'480px', width:'100%', boxShadow:'0 4px 24px rgba(0,0,0,.1)', border:'1px solid #e8e0d8', boxSizing:'border-box' }}>

            {/* Cabecera */}
            <div style={{ textAlign:'center', marginBottom:'28px' }}>
              <div style={{ fontSize:'48px', marginBottom:'10px' }}>📝</div>
              <h2 style={{ fontFamily:'Georgia,serif', color:'#611232', fontSize:'22px', fontWeight:900, margin:'0 0 8px' }}>
                Editar Boletín
              </h2>
              <p style={{ color:'#888', fontSize:'13px', margin:0, lineHeight:1.6 }}>
                Ingresa el número del boletín que deseas editar.<br/>
                El sistema cargará todas sus secciones en el editor.
              </p>
            </div>

            {/* Campo de ID */}
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#611232', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'7px' }}>
              Número de Boletín (ID)
            </label>
            <input
              type="number" min="1"
              value={bulletinId}
              onChange={e => setBulletinId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cargarBoletin()}
              placeholder="Ej: 1"
              style={{ width:'100%', padding:'12px 16px', border:'2px solid #d0b090', borderRadius:'10px', fontSize:'16px', fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
              onFocus={e => e.target.style.borderColor='#611232'}
              onBlur={e  => e.target.style.borderColor='#d0b090'}
            />

            {/* Error */}
            {errorCarga && (
              <div style={{ marginTop:'12px', background:'#fdf0f0', border:'1.5px solid #e8a0a0', borderRadius:'8px', padding:'10px 14px', color:'#8b2020', fontSize:'13px', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                <span style={{ flexShrink:0 }}>⚠</span>
                <span>{errorCarga}</span>
              </div>
            )}

            {/* Botón */}
            <button
              onClick={cargarBoletin}
              disabled={cargando}
              style={{ marginTop:'20px', width:'100%', background: cargando ? '#9b2247' : '#611232', color:'#fff', border:'none', borderRadius:'10px', padding:'14px', fontSize:'15px', fontWeight:700, cursor:cargando?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'background .15s' }}
            >
              {cargando
                ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⏳</span> Cargando secciones...</>
                : <><span>📂</span> Cargar para editar</>
              }
            </button>

            {/* Aviso */}
            <p style={{ marginTop:'16px', fontSize:'11px', color:'#aaa', textAlign:'center', lineHeight:1.6 }}>
              Los cambios que realices se guardarán como nuevas secciones.<br/>
              El documento original no se modifica hasta que presiones Guardar.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // PANTALLA 2 — Builder con las secciones cargadas
  // ══════════════════════════════════════════════════════
  return (
    <div className="app-layout" style={{ position:'relative' }}>

      {/* Barra superior con info del boletín que se edita */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, background:'#3a0000', height:'34px', display:'flex', alignItems:'center', padding:'0 12px', gap:'8px', fontSize:'12px', boxShadow:'0 2px 8px rgba(0,0,0,.3)', overflow:'hidden' }}>
        <button onClick={() => setModoEdicion(false)} style={{ background:'transparent', border:'none', color:'rgba(230,209,148,.7)', cursor:'pointer', fontSize:'12px', fontFamily:'inherit', padding:'0', display:'flex', alignItems:'center', gap:'5px' }}>
          ← Cambiar boletín
        </button>
        <div style={{ width:'1px', height:'18px', background:'rgba(255,255,255,.15)' }}/>
        <span style={{ color:'#e6d194', fontWeight:700 }}>✏ Editando Boletín #{bullIdActual}</span>
        <span style={{ background:'rgba(165,127,44,.3)', color:'#e6d194', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', border:'1px solid rgba(165,127,44,.4)' }}>
          {secciones.length} sección{secciones.length !== 1 ? 'es' : ''}
        </span>
        <button onClick={onVolver} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }}>
          Salir del editor ✕
        </button>
      </div>

      {/* Notificación de éxito */}
      {guardadoExitoso && (
        <div style={{ position:'fixed', top:'50px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'#1e5b4f', color:'#fff', padding:'12px 22px', borderRadius:'10px', fontSize:'14px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 6px 24px rgba(0,0,0,.25)', maxWidth:'90vw', width:'fit-content' }}>
          ✅ Cambios guardados correctamente.
          <button onClick={() => setGuardadoExitoso(false)} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'16px' }}>✕</button>
        </div>
      )}

      {/* Notificación de error */}
      {errorGuardado && (
        <div style={{ position:'fixed', top:'50px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'#8b2020', color:'#fff', padding:'12px 22px', borderRadius:'10px', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 6px 24px rgba(0,0,0,.25)', maxWidth:'min(520px, 90vw)', width:'fit-content' }}>
          ⚠ {errorGuardado}
          <button onClick={() => setErrorGuardado('')} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'16px' }}>✕</button>
        </div>
      )}

      {/* Layout de dos paneles — igual al builder normal con margen para la barra */}
      <div className="app-builder app-builder-editor">
        <ErrorBoundary>
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

      <FloatingToolbar
        onAgregarSeccion={handleAgregarSeccion}
        onGuardar={handleGuardar}
        onDescargar={handleDescargar}
        onVerDocumento={null}
        cargando={guardando}
        totalSecciones={secciones.length}
      />

      <div className="app-preview app-preview-editor">
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
