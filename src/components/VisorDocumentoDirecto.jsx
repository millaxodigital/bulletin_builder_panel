// ─────────────────────────────────────────────────────────────────────────
// components/VisorDocumentoDirecto.jsx
// ─────────────────────────────────────────────────────────────────────────
//
// ¿QUÉ HACE?
//   Es exactamente igual que VisorDocumento.jsx, PERO en lugar de mostrar
//   el input para que el usuario escriba el ID, recibe el bullId como
//   prop y lanza la búsqueda automáticamente al montarse.
//
//   Se usa desde RutaDocumento.jsx cuando la URL es /documento/2.
//
// ¿POR QUÉ NO MODIFICAR VisorDocumento DIRECTAMENTE?
//   VisorDocumento.jsx funciona bien para la pantalla normal (con input).
//   Si lo modificamos, podemos romper el flujo existente del toolbar.
//   Mejor tener un componente especializado para la ruta directa.
//
//   En Java sería como tener dos métodos en el controlador:
//   - buscarConId(@RequestParam id) → el del input
//   - buscarDesdeUrl(@PathVariable id) → el de la URL
//   Ambos llaman al mismo Service pero con distinta entrada.
//
// PROP bullId:
//   Número entero con el ID del boletín a mostrar.
//   Se pasa desde RutaDocumento.jsx después de extraerlo de la URL.
//
// PROP onVolver:
//   Función que se llama cuando el usuario presiona "Volver".
//   En RutaDocumento.jsx es navigate('/').
//
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect }   from 'react'
import { decodeCssFromIndex }    from '../utils/cssTokens'
import { decodeHtml }            from '../utils/htmlTokens'

const TOKEN    = import.meta.env.VITE_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJtaWxsYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3NzU2NjIxMSwiZXhwIjoxNzc3NTk1MDExfQ.zDQIBM_umyL1iYy6rWukbvVmm9LRD3WdnXtD2Y2pUR4'
const BASE_URL = import.meta.env.VITE_API_URL   || 'http://localhost:3001'

// ── Copiar DOC_STYLES y renderSeccion y construirHtmlDocumento de VisorDocumento
// (mismas funciones, mismo CSS — reutilizamos la lógica de renderizado)
const DOC_STYLES = `
.visor-body { font-family:'Noto Sans',sans-serif; font-size:14px; line-height:1.7; color:#1a1a1a; max-width:860px; margin:0 auto; padding:24px 22px 60px; }
.doc-h1 { font-family:Georgia,serif; font-size:22px; font-weight:900; color:#611232; margin:0 0 10px; }
.doc-h2 { font-family:Georgia,serif; font-size:17px; font-weight:700; color:#9b2247; margin:0 0 8px; }
.doc-h3 { font-family:'Noto Sans',sans-serif; font-size:13px; font-weight:700; color:#1e5b4f; text-transform:uppercase; letter-spacing:.05em; margin:0 0 6px; }
.noto-sans { font-family:'Noto Sans',sans-serif !important; }
.patria { font-family:Georgia,serif !important; }
.doc-p { font-size:14px; color:#222; margin:0 0 8px; line-height:1.7; }
.doc-ul { padding-left:20px; margin:0 0 8px; }
.doc-ul li::marker { color:#a57f2c; }
.doc-ol { padding-left:22px; margin:0 0 8px; }
.doc-ol li::marker { color:#1e5b4f; font-weight:700; }
.doc-highlight { background:#fffde7; border-left:4px solid #f9a825; padding:10px 14px; border-radius:4px; margin:0 0 8px; color:#5f4700; font-size:13px; display:flex; gap:8px; align-items:flex-start; }
.doc-note { border-left:4px solid #611232; padding:8px 14px; background:#fdf5f7; border-radius:0 4px 4px 0; margin:0 0 8px; font-style:italic; color:#333; }
.doc-hr { border:none; border-top:2px solid #d0b090; margin:12px 0; }
.doc-url { color:#1e5b4f; font-weight:600; text-decoration:underline; font-size:13px; }
.doc-mailto { color:#880e4f; font-weight:600; text-decoration:underline; font-size:13px; }
.doc-img-full { max-width:100%; display:block; border-radius:4px; margin:4px 0; }
.img-center { margin:0 auto; }
.text-left{text-align:left} .text-center{text-align:center} .text-right{text-align:right} .text-justify{text-align:justify}
.visor-body strong{font-weight:700;color:inherit} .visor-body em{font-style:italic} .visor-body u{text-decoration:underline} .visor-body mark{background:yellow;padding:0 2px;border-radius:2px}
.visor-cols{display:grid;gap:16px} .visor-cols-2{grid-template-columns:1fr 1fr} .visor-cols-3{grid-template-columns:1fr 1fr 1fr} .visor-col{padding:0;margin:0;min-width:0}
@media(max-width:768px){.visor-body{font-size:13px;padding:16px 16px 48px}.doc-h1{font-size:19px}.doc-h2{font-size:15px}.visor-cols-2{grid-template-columns:1fr}}
@media(max-width:480px){.visor-cols-2,.visor-cols-3{grid-template-columns:1fr}}
`

function renderSeccion(sec) {
  if (!sec.section_status) return ''
  const tag = sec.section_htmltag || 'div'
  const cssRaw = (sec.section_css || '').trim()
  let clases = ''
  if (cssRaw) {
    clases = /^[\d,\s]+$/.test(cssRaw) ? decodeCssFromIndex(cssRaw) : cssRaw
  }
  const ALINEACIONES = ['left','center','right','justify']
  const alineacion = ALINEACIONES.includes(sec.section_format) ? sec.section_format : null
  const styleAlign = alineacion ? `text-align:${alineacion};` : ''
  const fmt = sec.section_format || ''
  const TAGS_VALIDOS = ['h1','h2','h3','p','ul','ol','div','a','img','hr','blockquote','ul-ol','span','footer','table']
  let contenidoFormateado = ''
  if (fmt.includes('[') && fmt.includes(']')) {
    contenidoFormateado = decodeHtml(fmt)
  } else if (!ALINEACIONES.includes(fmt) && !TAGS_VALIDOS.includes(fmt) && fmt.trim()) {
    contenidoFormateado = fmt.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
  }
  const contenido = contenidoFormateado || sec.section_content || ''
  const cls = clases ? `class="${clases}"` : ''
  const style = styleAlign ? `style="${styleAlign}"` : ''
  switch (tag) {
    case 'h1': return `<h1 ${cls} ${style}>${sec.section_content}</h1>\n`
    case 'h2': return `<h2 ${cls} ${style}>${sec.section_content}</h2>\n`
    case 'h3': return `<h3 ${cls} ${style}>${sec.section_content}</h3>\n`
    case 'p': return `<p ${cls} ${style}>${contenido}</p>\n`
    case 'div':
      if (clases.includes('doc-highlight')) return `<div ${cls} ${style}><span style="font-size:18px;flex-shrink:0">⚠</span><div style="flex:1">${contenido}</div></div>\n`
      return `<div ${cls} ${style}>${contenido}</div>\n`
    case 'blockquote': return `<blockquote ${cls} ${style}>${contenido}</blockquote>\n`
    case 'ul': case 'ul-ol': case 'ol': return `<div ${cls} ${style}>${contenido}</div>\n`
    case 'hr': return `<hr ${cls}>\n`
    case 'img': {
      const desc = sec.resource_desc || ''
      const content = sec.section_content || ''
      let imgSrc = ''
      if (desc.startsWith('/') || desc.startsWith('http')) imgSrc = desc
      else if (content.startsWith('/') || content.startsWith('http')) imgSrc = content
      else if (desc) imgSrc = `/assets/section_images/${sec.bull_id}/${desc}`
      else if (content) imgSrc = `/assets/section_images/${sec.bull_id}/${content}`
      return imgSrc
        ? `<img src="${imgSrc}" alt="${content}" ${cls} ${style}>\n`
        : `<div style="background:#f5f5f5;border:1px dashed #ccc;padding:12px;text-align:center;color:#aaa;border-radius:6px">📷 ${content}</div>\n`
    }
    case 'a': {
      const href = sec.resource_desc || sec.section_content || '#'
      const texto = sec.section_content || href
      const esMail = clases.includes('doc-mailto') || (href.includes('@') && !href.startsWith('http'))
      if (esMail) return `<div ${style}><a class="doc-mailto" href="mailto:${href}">${texto}</a></div>\n`
      return `<div ${style}><a class="doc-url" href="${href}" target="_blank" rel="noopener noreferrer">${texto}</a></div>\n`
    }
    default: return contenido ? `<div ${cls} ${style}>${contenido}</div>\n` : ''
  }
}

function construirHtmlDocumento(secciones) {
  if (!secciones || !secciones.length) return ''
  const activas = secciones.filter(s => s.section_status !== false)
    .sort((a,b) => a.section_segment !== b.section_segment ? a.section_segment - b.section_segment : a.section_order - b.section_order)
  const mapSeg = new Map()
  activas.forEach(sec => { const k = sec.section_segment; if (!mapSeg.has(k)) mapSeg.set(k, []); mapSeg.get(k).push(sec) })
  let html = ''
  mapSeg.forEach(items => {
    const subsNums = [...new Set(items.map(s => s.section_subsegment))].filter(n => n > 0).sort()
    if (subsNums.length > 1) {
      const cols = Math.min(subsNums.length, 3)
      html += `<div class="visor-cols visor-cols-${cols}">\n`
      subsNums.forEach(subNum => {
        const sub = items.filter(s => s.section_subsegment === subNum).sort((a,b) => a.section_order - b.section_order)
        html += `<div class="visor-col">${sub.map(renderSeccion).join('')}</div>\n`
      })
      html += `</div>\n`
      items.filter(s => s.section_subsegment === 0).sort((a,b) => a.section_order - b.section_order).forEach(s => { html += renderSeccion(s) })
    } else {
      items.forEach(s => { html += renderSeccion(s) })
    }
  })
  return html
}

// ── COMPONENTE ────────────────────────────────────────────────────────────
export default function VisorDocumentoDirecto({ bullId, onVolver }) {
  const [secciones,    setSecciones]    = useState(null)
  const [cargando,     setCargando]     = useState(true)
  const [error,        setError]        = useState('')

  // useEffect con [bullId]: se ejecuta una vez al montar, y de nuevo
  // si bullId cambia (aunque en este caso no cambia).
  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError('')
      setSecciones(null)

      console.log(`[VisorDirecto] GET ${BASE_URL}/bulletin/sections/${bullId}`)

      try {
        const res = await fetch(`${BASE_URL}/bulletin/sections/${bullId}`, {
          headers: { 'Authorization': `Bearer ${TOKEN}`, 'accept': '*/*' },
        })

        if (res.status === 404) {
          setError(`No se encontraron secciones para el boletín #${bullId}.`)
          setSecciones([])
          return
        }
        if (!res.ok) {
          if (res.status === 401) throw new Error('Token expirado. Actualiza VITE_API_TOKEN en .env')
          throw new Error(`Error del servidor: ${res.json().message || res.statusText}`)
        }

        const data = await res.json()
        const lista = Array.isArray(data) ? data : (data.data || [])
        console.log(`[VisorDirecto] ${lista.length} secciones cargadas`)
        setSecciones(lista)

      } catch (err) {
        setError(err.message || 'No se pudo conectar con el servidor.')
        console.error('[VisorDirecto] Error:', err)
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [bullId])

  const htmlDocumento = secciones && secciones.length > 0
    ? construirHtmlDocumento(secciones)
    : ''

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f5', fontFamily:"'Noto Sans',sans-serif" }}>
      <style>{DOC_STYLES}</style>

      {/* Barra de navegación */}
      <div style={{
        background:'#611232', padding:'0 24px',
        display:'flex', alignItems:'center', gap:'16px', height:'52px',
        boxShadow:'0 3px 14px rgba(97,18,50,.4)',
        position:'sticky', top:0, zIndex:100,
      }}>
        <button onClick={onVolver} style={{
          background:'transparent', border:'1.5px solid rgba(230,209,148,.45)',
          color:'#e6d194', borderRadius:'7px', padding:'6px 14px',
          cursor:'pointer', fontSize:'13px', fontFamily:'inherit',
          display:'flex', alignItems:'center', gap:'6px',
        }}>
          ← Volver al Builder
        </button>
        <div style={{ width:'1px', height:'24px', background:'rgba(255,255,255,.2)' }}/>
        <span style={{ color:'rgba(255,255,255,.85)', fontSize:'13px', fontWeight:700 }}>
          📄 Visualizando Boletín #{bullId}
        </span>
        {!cargando && secciones && (
          <span style={{
            background:'rgba(165,127,44,.3)', color:'#e6d194',
            fontSize:'11px', fontWeight:700, padding:'3px 10px',
            borderRadius:'100px', border:'1px solid rgba(165,127,44,.5)',
          }}>
            {secciones.length} sección{secciones.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Cargando */}
      {cargando && (
        <div style={{ maxWidth:'860px', margin:'80px auto', textAlign:'center', color:'#aaa' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px', animation:'spin 1s linear infinite' }}>⏳</div>
          <p style={{ fontSize:'16px', color:'#611232', fontWeight:700 }}>
            Cargando boletín #{bullId}...
          </p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Error */}
      {!cargando && error && (
        <div style={{ maxWidth:'860px', margin:'40px auto', padding:'0 24px' }}>
          <div style={{
            background:'#fdf0f0', border:'1.5px solid #e8a0a0',
            borderRadius:'10px', padding:'20px 24px',
            color:'#8b2020', display:'flex', gap:'12px', alignItems:'flex-start',
          }}>
            <span style={{ fontSize:'24px' }}>⚠</span>
            <div>
              <strong style={{ display:'block', marginBottom:'4px' }}>No se pudo mostrar el documento</strong>
              <span style={{ fontSize:'13px' }}>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sin secciones activas */}
      {!cargando && !error && secciones && secciones.length === 0 && (
        <div style={{ maxWidth:'860px', margin:'80px auto', textAlign:'center', color:'#aaa' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>📭</div>
          <p>No hay secciones activas para el boletín #{bullId}.</p>
        </div>
      )}

      {/* Documento */}
      {!cargando && !error && htmlDocumento && (
        <div className="visor-body" dangerouslySetInnerHTML={{ __html: htmlDocumento }} />
      )}
    </div>
  )
}
