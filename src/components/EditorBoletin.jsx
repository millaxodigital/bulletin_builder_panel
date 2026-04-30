// ─────────────────────────────────────────────────────────────────────────
// EditorBoletín.jsx  — Pantalla de edición de boletín existente
// ─────────────────────────────────────────────────────────────────────────
//
// ¿CUÁNDO SE USA?
//   Cuando el usuario hace clic en el botón "Editar" del toolbar flotante.
//   Muestra primero un formulario para ingresar el ID del boletín,
//   luego carga las secciones y abre el builder con esos datos.
//
// DIFERENCIA CON EditorConDatos.jsx:
//   EditorBoletín → tiene la pantalla de "Ingresa el ID" primero
//   EditorConDatos → recibe los datos ya cargados (desde RutaGuardar)
//
// CORRECCIÓN EN ESTA VERSIÓN:
//   El TOKEN estaba hardcodeado. Ahora viene de api.js → .env.
//   Se agregó el botón "Ver Doc" en el FloatingToolbar (antes faltaba).
//
// ─────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react'
import BuilderPanel    from './BuilderPanel'
import PreviewPanel    from './PreviewPanel'
import FloatingToolbar from './FloatingToolbar'
import ErrorBoundary   from './ErrorBoundary'
import { apiRowsToSecciones } from '../utils/apiToBuilder'
import { useBuilderState }    from '../hooks/useBuilderState'
import { useGuardarBoletin }  from '../hooks/useGuardarBoletin'
import VisorDocumento         from './VisorDocumento'

// Importar TOKEN y BASE_URL del servicio centralizado (NO hardcodear aquí)
import { TOKEN, BASE_URL } from '../services/api'

function getSufijoDeFecha() {
  const n = new Date()
  const p = x => String(x).padStart(2, '0')
  return '_' + n.getFullYear() + p(n.getMonth()+1) + p(n.getDate()) + '_' + p(n.getHours()) + p(n.getMinutes()) + p(n.getSeconds())
}

function descargarJson(datos, nombre) {
  nombre = nombre || 'boletin'
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = nombre + getSufijoDeFecha() + '.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function EditorBoletin({ onVolver }) {
  // Estado de la pantalla del editor
  const [bulletinId,   setBulletinId]   = useState('')      // lo que escribe el usuario
  const [cargando,     setCargando]     = useState(false)   // true mientras carga
  const [errorCarga,   setErrorCarga]   = useState('')      // error al cargar
  const [bullIdActual, setBullIdActual] = useState(null)    // ID que se está editando
  const [modoEdicion,  setModoEdicion]  = useState(false)   // false=pantalla carga, true=editor
  const [panelMovil,   setPanelMovil]   = useState('builder')
  const [verVisor,     setVerVisor]     = useState(false)   // true=mostrar visor

  // Estado del builder (compartido con useBuilderState)
  const {
    secciones, setSecciones,
    activeNav, previewScrollId, builderRef,
    handleNavegar, handleElementoAbierto,
    handleSeccionesChange, handleAgregarSeccion,
  } = useBuilderState()

  const { guardar, cargando: guardando } = useGuardarBoletin()
  const [guardadoOk,  setGuardadoOk]  = useState(false)
  const [errorGuard,  setErrorGuard]  = useState('')

  // ── Cargar boletín desde la API ────────────────────────────────────
  const cargarBoletin = useCallback(async function() {
    const id = parseInt(bulletinId, 10)
    if (!id || id <= 0) {
      setErrorCarga('Ingresa un número de boletín válido (mayor a 0).')
      return
    }

    setCargando(true)
    setErrorCarga('')

    try {
      console.log('[EDITOR] GET ' + BASE_URL + '/bulletin/sections/' + id)

      const res = await fetch(BASE_URL + '/bulletin/sections/' + id, {
        headers: { 'Authorization': 'Bearer ' + TOKEN, 'accept': '*/*' }
      })

      // Manejo explícito de cada código de error
      if (!res.ok) {
        if (res.status === 401) throw new Error('Sesión expirada. Actualiza VITE_API_TOKEN en .env')
        if (res.status === 403) throw new Error('No tienes permisos para este boletín.')
        if (res.status === 404) throw new Error('No se encontró el boletín con ID ' + id + '. Verifica que existe en la BD.')
        throw new Error('Error del servidor: ' + res.status)
      }

      const data = await res.json()
      const rows = Array.isArray(data) ? data : (data.data || [])

      if (rows.length === 0) {
        throw new Error('El boletín ' + id + ' no tiene secciones. Usa el builder para crear su contenido.')
      }

      console.log('[EDITOR] ' + rows.length + ' secciones cargadas')

      // Convertir el array plano de la API al estado anidado del builder
      // apiRowsToSecciones hace la transformación: filas → secciones → subsegmentos → elementos
      const seccionesReconstruidas = apiRowsToSecciones(rows)
      setSecciones(function() { return seccionesReconstruidas })
      setBullIdActual(id)
      setModoEdicion(true)

    } catch (err) {
      setErrorCarga('No se pudo cargar el boletín. ' + (err.message || 'Error desconocido.'))
      console.error('[EDITOR] Error:', err)
    } finally {
      setCargando(false)
    }
  }, [bulletinId, setSecciones])

  // ── Guardar cambios ────────────────────────────────────────────────
  const handleGuardar = useCallback(async function() {
    const flat     = builderRef.current && builderRef.current.buildJsonActual && builderRef.current.buildJsonActual()
    const imagenes = (builderRef.current && builderRef.current.getImagenes && builderRef.current.getImagenes()) || {}
    if (!flat) {
      setErrorGuard('No hay contenido para guardar.')
      return
    }

    setGuardadoOk(false)
    setErrorGuard('')

    try {
      await guardar(flat, imagenes)
      setGuardadoOk(true)
      setTimeout(function() { setGuardadoOk(false) }, 5000)
    } catch (err) {
      var msg = (err.response && err.response.data && (err.response.data.message || err.response.data.error))
        || err.message || 'Error desconocido'
      setErrorGuard('No se pudo guardar: ' + msg)
    }
  }, [guardar, builderRef])

  const handleDescargar = useCallback(function() {
    const flat = builderRef.current && builderRef.current.buildJsonActual && builderRef.current.buildJsonActual()
    if (flat) descargarJson(flat, 'boletin_' + bullIdActual)
  }, [builderRef, bullIdActual])

  // ── Pantalla del visor ─────────────────────────────────────────────
  if (verVisor) {
    return <VisorDocumento onVolver={function() { setVerVisor(false) }} />
  }

  // ── PANTALLA 1: Formulario de carga ───────────────────────────────
  if (!modoEdicion) {
    return (
      <div style={{ minHeight:'100vh', background:'#faf8f5', fontFamily:"'Noto Sans',sans-serif", display:'flex', flexDirection:'column' }}>
        <div style={{ background:'#611232', height:'52px', display:'flex', alignItems:'center', padding:'0 16px', gap:'12px', boxShadow:'0 3px 14px rgba(97,18,50,.4)', flexShrink:0 }}>
          <button onClick={onVolver} style={{ background:'transparent', border:'1.5px solid rgba(230,209,148,.45)', color:'#e6d194', borderRadius:'7px', padding:'6px 14px', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}>
            ← Volver al Builder
          </button>
          <div style={{ width:'1px', height:'24px', background:'rgba(255,255,255,.2)' }}/>
          <span style={{ color:'rgba(255,255,255,.85)', fontSize:'13px', fontWeight:700 }}>
            ✏ Editor de Boletines
          </span>
        </div>

        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'clamp(20px,6vw,40px) clamp(16px,5vw,36px)', maxWidth:'480px', width:'100%', boxShadow:'0 4px 24px rgba(0,0,0,.1)', border:'1px solid #e8e0d8', boxSizing:'border-box' }}>
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

            <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#611232', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'7px' }}>
              Número de Boletín (ID)
            </label>
            <input
              type="number" min="1"
              value={bulletinId}
              onChange={function(e) { setBulletinId(e.target.value) }}
              onKeyDown={function(e) { if (e.key === 'Enter') cargarBoletin() }}
              placeholder="Ej: 2"
              style={{ width:'100%', padding:'12px 16px', border:'2px solid #d0b090', borderRadius:'10px', fontSize:'16px', fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
              onFocus={function(e) { e.target.style.borderColor='#611232' }}
              onBlur={function(e)  { e.target.style.borderColor='#d0b090' }}
            />

            {/* Mensaje de error de carga */}
            {errorCarga && (
              <div style={{ marginTop:'12px', background:'#fdf0f0', border:'1.5px solid #e8a0a0', borderRadius:'8px', padding:'10px 14px', color:'#8b2020', fontSize:'13px', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                <span style={{ flexShrink:0 }}>⚠</span>
                <span style={{ flex:1 }}>{errorCarga}</span>
              </div>
            )}

            <button
              onClick={cargarBoletin}
              disabled={cargando}
              style={{ marginTop:'20px', width:'100%', background: cargando ? '#9b2247' : '#611232', color:'#fff', border:'none', borderRadius:'10px', padding:'14px', fontSize:'15px', fontWeight:700, cursor: cargando ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'background .15s' }}
            >
              {cargando ? <><span>⏳</span> Cargando secciones...</> : <><span>📂</span> Cargar para editar</>}
            </button>

            <p style={{ marginTop:'16px', fontSize:'11px', color:'#aaa', textAlign:'center', lineHeight:1.6 }}>
              Los cambios se guardarán actualizando las secciones existentes<br/>
              y creando nuevas si agregas secciones al documento.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── PANTALLA 2: Builder con las secciones cargadas ─────────────────
  return (
    <div className="app-layout" style={{ position:'relative' }}>

      {/* Barra superior con el ID del boletín que se edita */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, background:'#3a0000', height:'34px', display:'flex', alignItems:'center', padding:'0 12px', gap:'8px', fontSize:'12px', boxShadow:'0 2px 8px rgba(0,0,0,.3)', overflow:'hidden' }}>
        <button onClick={function() { setModoEdicion(false) }} style={{ background:'transparent', border:'none', color:'rgba(230,209,148,.7)', cursor:'pointer', fontSize:'12px', fontFamily:'inherit', padding:0 }}>
          ← Cambiar boletín
        </button>
        <div style={{ width:'1px', height:'18px', background:'rgba(255,255,255,.15)' }}/>
        {/* Nombre del boletín visible — mejora de UX */}
        <span style={{ color:'#e6d194', fontWeight:700 }}>✏ Editando Boletín #{bullIdActual}</span>
        <span style={{ background:'rgba(165,127,44,.3)', color:'#e6d194', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', border:'1px solid rgba(165,127,44,.4)' }}>
          {secciones.length} sección{secciones.length !== 1 ? 'es' : ''}
        </span>
        <button onClick={onVolver} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }}>
          Salir ✕
        </button>
      </div>

      {/* Notificación de éxito */}
      {guardadoOk && (
        <div style={{ position:'fixed', top:'50px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'#1e5b4f', color:'#fff', padding:'12px 22px', borderRadius:'10px', fontSize:'14px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 6px 24px rgba(0,0,0,.25)', maxWidth:'90vw' }}>
          ✅ Cambios guardados correctamente.
          <button onClick={function() { setGuardadoOk(false) }} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'16px' }}>✕</button>
        </div>
      )}

      {/* Notificación de error */}
      {errorGuard && (
        <div style={{ position:'fixed', top:'50px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'#8b2020', color:'#fff', padding:'12px 22px', borderRadius:'10px', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 6px 24px rgba(0,0,0,.25)', maxWidth:'90vw' }}>
          ⚠ {errorGuard}
          <button onClick={function() { setErrorGuard('') }} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'16px' }}>✕</button>
        </div>
      )}

      {/* Panel builder */}
      <div className={'app-builder app-builder-editor' + (panelMovil !== 'builder' ? ' panel-oculto-movil' : '')}>
        <ErrorBoundary>
          <BuilderPanel
            ref={builderRef}
            seccionesExternas={secciones}
            onSeccionesChange={handleSeccionesChange}
            activeNavExterno={activeNav}
            onElementoAbierto={handleElementoAbierto}
          />
        </ErrorBoundary>
      </div>

      <FloatingToolbar
        onAgregarSeccion={handleAgregarSeccion}
        onGuardar={handleGuardar}
        onDescargar={handleDescargar}
        onVerDocumento={function() { setVerVisor(true) }}
        cargando={guardando}
        totalSecciones={secciones.length}
        panelMovil={panelMovil}
        onTogglePanelMovil={function() { setPanelMovil(function(p) { return p === 'builder' ? 'preview' : 'builder' }) }}
      />

      {/* Panel preview */}
      <div className={'app-preview app-preview-editor' + (panelMovil !== 'preview' ? ' panel-oculto-movil' : '')}>
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
