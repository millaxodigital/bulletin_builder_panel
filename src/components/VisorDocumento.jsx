// ─────────────────────────────────────────────────────────────────────────
// VisorDocumento.jsx — Pantalla de visualización pública del boletín
// ─────────────────────────────────────────────────────────────────────────
//
// ¿QUÉ HACE?
//   Muestra el documento terminado como lo vería el ciudadano.
//   Sin bordes de segmentos ni botones de edición — solo el contenido.
//
// CORRECCIÓN:
//   El TOKEN ya no está hardcodeado aquí.
//   Se importa de services/api.js que lo lee del archivo .env.
//   Antes: const TOKEN = 'eyJhbGciOi...' ← INCORRECTO, inseguro
//   Ahora: import { TOKEN, BASE_URL } from '../services/api' ← CORRECTO
//
// PROP:
//   onVolver → función para volver al builder o editor
//
// ─────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { decodeCssFromIndex } from '../utils/cssTokens'
import { decodeHtml }         from '../utils/htmlTokens'

// Importar TOKEN y BASE_URL del servicio centralizado
// Así todos los componentes usan el mismo token del .env
import { TOKEN, BASE_URL } from '../services/api'

// ── Estilos del documento publicado ───────────────────────────────────
// Se inyectan con <style>{DOC_STYLES}</style> para que apliquen
// dentro del dangerouslySetInnerHTML que renderiza el HTML del documento.
const DOC_STYLES = `
.visor-body { font-family:'Noto Sans',sans-serif; font-size:14px; line-height:1.7; color:#1a1a1a; max-width:860px; margin:0 auto; padding:24px 22px 60px; }
.doc-h1 { font-family:Georgia,serif; font-size:22px; font-weight:900; color:#611232; margin:0 0 10px; }
.doc-h2 { font-family:Georgia,serif; font-size:17px; font-weight:700; color:#9b2247; margin:0 0 8px; }
.doc-h3 { font-family:'Noto Sans',sans-serif; font-size:13px; font-weight:700; color:#1e5b4f; text-transform:uppercase; letter-spacing:.05em; margin:0 0 6px; }
.noto-sans { font-family:'Noto Sans',sans-serif !important; }
.patria    { font-family:Georgia,serif !important; }
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
.img-left   { margin-right:auto; }
.img-center { margin:0 auto; }
.img-right  { margin-left:auto; }
.text-left{text-align:left} .text-center{text-align:center} .text-right{text-align:right} .text-justify{text-align:justify}
.visor-body strong{font-weight:700;color:inherit} .visor-body em{font-style:italic} .visor-body u{text-decoration:underline} .visor-body s{text-decoration:line-through} .visor-body mark{background:yellow;padding:0 2px;border-radius:2px}
.visor-cols{display:grid;gap:16px;margin:0;padding:0} .visor-cols-2{grid-template-columns:1fr 1fr} .visor-cols-3{grid-template-columns:1fr 1fr 1fr} .visor-col{padding:0;margin:0;min-width:0}
@media(max-width:768px){.visor-body{font-size:13px;padding:16px 16px 48px}.doc-h1{font-size:19px}.doc-h2{font-size:15px}.visor-cols-2{grid-template-columns:1fr}}
@media(max-width:480px){.visor-body{font-size:13px;padding:12px 12px 40px}.visor-cols-2,.visor-cols-3{grid-template-columns:1fr}}
`

// ── renderSeccion ──────────────────────────────────────────────────────
// Convierte UNA fila de bulletin_sections al HTML para mostrar.
function renderSeccion(sec) {
  if (!sec.section_status) return ''  // omitir secciones dadas de baja

  const tag    = sec.section_htmltag || 'div'
  const cssRaw = (sec.section_css || '').trim()

  // Decodificar section_css: "1,22" → "doc-h1 text-center"
  let clases = ''
  if (cssRaw) {
    clases = /^[\d,\s]+$/.test(cssRaw) ? decodeCssFromIndex(cssRaw) : cssRaw
  }

  // Detectar alineación para estilo inline
  const ALIN = ['left','center','right','justify']
  const alineacion = ALIN.includes(sec.section_format) ? sec.section_format : null
  const styleAlign = alineacion ? `text-align:${alineacion};` : ''

  // Decodificar section_format: "[BOLD_START]texto[BOLD_FINAL]" → "<strong>texto</strong>"
  const fmt  = sec.section_format || ''
  const TAGS = ['h1','h2','h3','p','ul','ol','div','a','img','hr','blockquote','ul-ol','span']
  let contenidoFormateado = ''
  if (fmt.includes('[') && fmt.includes(']')) {
    contenidoFormateado = decodeHtml(fmt)
  } else if (!ALIN.includes(fmt) && !TAGS.includes(fmt) && fmt.trim()) {
    // Limpiar scripts peligrosos del contenido legacy
    contenidoFormateado = fmt
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
  }

  const contenido = contenidoFormateado || sec.section_content || ''
  const cls   = clases    ? `class="${clases}"`       : ''
  const style = styleAlign ? `style="${styleAlign}"` : ''

  switch (tag) {
    case 'h1': return `<h1 ${cls} ${style}>${sec.section_content}</h1>\n`
    case 'h2': return `<h2 ${cls} ${style}>${sec.section_content}</h2>\n`
    case 'h3': return `<h3 ${cls} ${style}>${sec.section_content}</h3>\n`
    case 'p':  return `<p ${cls} ${style}>${contenido}</p>\n`
    case 'div':
      if (clases.includes('doc-highlight')) {
        return `<div ${cls} ${style}><span style="font-size:18px;flex-shrink:0;line-height:1.4">⚠</span><div style="flex:1">${contenido}</div></div>\n`
      }
      return `<div ${cls} ${style}>${contenido}</div>\n`
    case 'blockquote': return `<blockquote ${cls} ${style}>${contenido}</blockquote>\n`
    case 'ul': case 'ul-ol': case 'ol': return `<div ${cls} ${style}>${contenido}</div>\n`
    case 'hr': return `<hr ${cls}>\n`
    case 'img': {
      const desc    = sec.resource_desc || ''
      const content = sec.section_content || ''
      let imgSrc    = ''
      if (desc.startsWith('/') || desc.startsWith('http'))         imgSrc = desc
      else if (content.startsWith('/') || content.startsWith('http')) imgSrc = content
      else if (desc)    imgSrc = `/assets/section_images/${sec.bull_id}/${desc}`
      else if (content) imgSrc = `/assets/section_images/${sec.bull_id}/${content}`
      return imgSrc
        ? `<img src="${imgSrc}" alt="${content}" ${cls} ${style}>\n`
        : `<div style="background:#f5f5f5;border:1px dashed #ccc;padding:12px;text-align:center;color:#aaa;border-radius:6px">📷 ${content}</div>\n`
    }
    case 'a': {
      const href   = sec.resource_desc || sec.section_content || '#'
      const texto  = sec.section_content || href
      const esMail = clases.includes('doc-mailto') || (href.includes('@') && !href.startsWith('http'))
      if (esMail) return `<div ${style}><a class="doc-mailto" href="mailto:${href}">${texto}</a></div>\n`
      return `<div ${style}><a class="doc-url" href="${href}" target="_blank" rel="noopener noreferrer">${texto}</a></div>\n`
    }
    default:
      return contenido ? `<div ${cls} ${style}>${contenido}</div>\n` : ''
  }
}

// ── construirHtmlDocumento ─────────────────────────────────────────────
function construirHtmlDocumento(secciones) {
  if (!secciones || !secciones.length) return ''
  const activas = secciones
    .filter(s => s.section_status !== false)
    .sort((a, b) => a.section_segment !== b.section_segment
      ? a.section_segment - b.section_segment
      : a.section_order   - b.section_order)
  const mapSeg = new Map()
  activas.forEach(sec => {
    const k = sec.section_segment
    if (!mapSeg.has(k)) mapSeg.set(k, [])
    mapSeg.get(k).push(sec)
  })
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

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────
export default function VisorDocumento({ onVolver }) {
  const [bulletinId,   setBulletinId]   = useState('')
  const [secciones,    setSecciones]    = useState(null)
  const [cargando,     setCargando]     = useState(false)
  const [error,        setError]        = useState('')
  const [bullIdActual, setBullIdActual] = useState(null)

  const buscarContenido = useCallback(async () => {
    const id = parseInt(bulletinId, 10)
    if (!id || id <= 0) {
      setError('Por favor ingresa un número de boletín válido (número entero positivo).')
      return
    }
    setCargando(true)
    setError('')
    setSecciones(null)

    try {
      console.log(`[VISOR] GET ${BASE_URL}/bulletin/sections/${id}`)

      // TOKEN viene de services/api.js (lee del .env)
      const res = await fetch(`${BASE_URL}/bulletin/sections/${id}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'accept': '*/*' }
      })

      if (!res.ok) {
        if (res.status === 401) throw new Error('Token expirado. Actualiza VITE_API_TOKEN en el archivo .env')
        if (res.status === 403) throw new Error('No tienes permiso para ver este boletín.')
        if (res.status === 404) throw new Error(`No se encontró el boletín con ID ${id}.`)
        throw new Error(`Error del servidor: ${res.status}`)
      }

      const data  = await res.json()
      const lista = Array.isArray(data) ? data : (data.data || [])
      console.log(`[VISOR] Boletín ${id}: ${lista.length} secciones`, lista)
      setSecciones(lista)
      setBullIdActual(id)

    } catch (err) {
      setError(`Hubo un problema al obtener el boletín. ${err.message || 'Error desconocido.'}`)
      console.error('[VISOR] Error completo:', err)
    } finally {
      setCargando(false)
    }
  }, [bulletinId])

  const htmlDocumento = secciones ? construirHtmlDocumento(secciones) : ''

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f5', fontFamily:"'Noto Sans',sans-serif" }}>
      <style>{DOC_STYLES}</style>

      {/* Barra de navegación */}
      <div style={{ background:'#611232', padding:'0 24px', display:'flex', alignItems:'center', gap:'16px', height:'52px', boxShadow:'0 3px 14px rgba(97,18,50,.4)', position:'sticky', top:0, zIndex:100, flexWrap:'wrap' }}>
        <button onClick={onVolver} style={{ background:'transparent', border:'1.5px solid rgba(230,209,148,.45)', color:'#e6d194', borderRadius:'7px', padding:'6px 14px', cursor:'pointer', fontSize:'13px', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'6px', whiteSpace:'nowrap' }}>
          ← Volver al Builder
        </button>
        <div style={{ width:'1px', height:'24px', background:'rgba(255,255,255,.2)', flexShrink:0 }}/>
        <span style={{ color:'rgba(255,255,255,.85)', fontSize:'13px', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
          📄 Visualizador de Boletines
        </span>
        {bullIdActual && (
          <span style={{ background:'rgba(165,127,44,.3)', color:'#e6d194', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'100px', border:'1px solid rgba(165,127,44,.5)', whiteSpace:'nowrap', flexShrink:0 }}>
            Boletín #{bullIdActual}
          </span>
        )}
      </div>

      {/* Panel de búsqueda */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e0d8', padding:'18px 24px', boxSizing:'border-box' }}>
        <div style={{ maxWidth:'860px', margin:'0 auto', display:'flex', alignItems:'flex-end', gap:'12px', flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 180px', minWidth:'140px' }}>
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#611232', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'6px' }}>
              Número de Boletín (ID)
            </label>
            <input
              type="number" min="1"
              value={bulletinId}
              onChange={e => setBulletinId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarContenido()}
              placeholder="Ej: 1"
              style={{ width:'100%', padding:'9px 14px', border:'2px solid #d0b090', borderRadius:'8px', fontSize:'15px', fontFamily:'inherit', outline:'none', transition:'border-color .15s', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor = '#611232'}
              onBlur={e  => e.target.style.borderColor = '#d0b090'}
            />
          </div>
          <button
            onClick={buscarContenido}
            disabled={cargando}
            style={{ background: cargando ? '#9b2247' : '#611232', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 22px', fontSize:'14px', fontWeight:700, cursor: cargando ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'8px', transition:'background .15s', whiteSpace:'nowrap' }}
          >
            {cargando ? '⏳ Buscando...' : '🔍 Buscar Contenido'}
          </button>
        </div>
        {error && (
          <div style={{ maxWidth:'860px', margin:'12px auto 0', background:'#fdf0f0', border:'1.5px solid #e8a0a0', borderRadius:'8px', padding:'12px 16px', color:'#8b2020', fontSize:'13px', display:'flex', alignItems:'flex-start', gap:'10px' }}>
            <span style={{ fontSize:'18px', flexShrink:0 }}>⚠</span>
            <span style={{ flex:1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background:'none', border:'none', color:'#8b2020', cursor:'pointer', fontSize:'18px', padding:'0 4px', lineHeight:1 }}>✕</button>
          </div>
        )}
      </div>

      {/* Documento */}
      <div>
        {!secciones && !cargando && !error && (
          <div style={{ maxWidth:'860px', margin:'60px auto', textAlign:'center', color:'#bbb', padding:'0 24px' }}>
            <div style={{ fontSize:'64px', marginBottom:'16px' }}>📄</div>
            <p style={{ fontSize:'16px', margin:'0 0 8px', color:'#999' }}>Ingresa el ID del boletín y haz clic en "Buscar Contenido".</p>
            <p style={{ fontSize:'13px', color:'#ccc' }}>El documento se mostrará con todo su formato aplicado.</p>
          </div>
        )}
        {secciones && secciones.length === 0 && (
          <div style={{ maxWidth:'860px', margin:'60px auto', textAlign:'center', color:'#bbb', padding:'0 24px' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>📭</div>
            <p>No se encontraron secciones activas para el boletín #{bullIdActual}.</p>
          </div>
        )}
        {secciones && secciones.length > 0 && (
          <div className="visor-body" dangerouslySetInnerHTML={{ __html: htmlDocumento }} />
        )}
      </div>
    </div>
  )
}
