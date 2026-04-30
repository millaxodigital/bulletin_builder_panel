// PreviewPanel.jsx — v4
// ─────────────────────────────────────────────────────────
// FIXES en esta versión:
//
// 1. SCROLL AUTO hacia abajo cuando se agrega contenido nuevo
//    Antes: solo scrolleaba al agregar una SECCIÓN nueva.
//    Ahora: también scrollea cuando crece el número total de
//    elementos o el contenido de texto (más caracteres = scroll).
//
// 2. CLIC en preview → abre elemento individual en builder
//    Antes: el preview solo identificaba segmento y subsegmento.
//    Ahora: cada elemento tiene data-elem-id y se notifica al padre.
//
// 3. SCROLL builder→preview (sincronización inversa)
//    Cuando el usuario abre un elemento en el builder,
//    App.jsx llama a scrollPreviewToElem(elemId) que hace
//    scrollIntoView en el div correspondiente del preview.
// ─────────────────────────────────────────────────────────
import { useRef, useEffect, useMemo, useCallback } from 'react'
import styles from './PreviewPanel.module.css'

const DOC_CSS = `
.doc-preview-body{font-family:'Noto Sans',sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;padding:18px 22px}
.doc-h1{font-family:Georgia,serif;font-size:22px;font-weight:900;color:#611232;margin:0 0 10px}
.doc-h2{font-family:Georgia,serif;font-size:17px;font-weight:700;color:#9b2247;margin:0 0 8px}
.doc-h3{font-family:'Noto Sans',sans-serif;font-size:13px;font-weight:700;color:#1e5b4f;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px}
.doc-p{font-size:14px;color:#222;margin:0 0 8px;line-height:1.7}
.doc-ul{padding-left:20px;margin:0 0 8px}.doc-ul li::marker{color:#a57f2c}
.doc-ol{padding-left:22px;margin:0 0 8px}.doc-ol li::marker{color:#1e5b4f;font-weight:700}
.doc-highlight{background:#fffde7;border-left:4px solid #f9a825;padding:10px 14px;border-radius:4px;margin:0 0 8px;color:#5f4700;font-size:13px}
.doc-note{border-left:4px solid #611232;padding:8px 14px;background:#fdf5f7;border-radius:0 4px 4px 0;margin:0 0 8px;font-style:italic;color:#333}
.doc-hr{border:none;border-top:2px solid #d0b090;margin:12px 0}
.doc-url{color:#1e5b4f;font-weight:600;text-decoration:underline;font-size:13px}
.doc-mailto{color:#880e4f;font-weight:600;text-decoration:underline;font-size:13px}
.doc-img-full{max-width:100%;display:block;border-radius:4px;margin:4px 0}
.text-left{text-align:left}.text-center{text-align:center}.text-right{text-align:right}.text-justify{text-align:justify}
.pv-seg{padding:10px 0;border-bottom:1px dashed #ede8e0;border-radius:4px;transition:background .15s}
.pv-seg:last-child{border-bottom:none}
.pv-seg:hover{background:rgba(97,18,50,.04)}
.pv-seg-label{display:flex;align-items:center;gap:6px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #eddde2;cursor:pointer}
.pv-seg-badge{font-size:10px;font-weight:700;font-family:'Courier New',monospace;background:#611232;color:#fff;padding:2px 8px;border-radius:100px}
.pv-seg-name{font-size:12px;color:#611232;font-style:italic}
.pv-inspect-hint{font-size:9px;opacity:0;transition:opacity .15s;margin-left:auto}
.pv-seg:hover .pv-inspect-hint,.pv-sub-card:hover .pv-inspect-hint,.pv-elem-wrap:hover .pv-inspect-hint{opacity:.6}
.pv-sub-grid{display:grid;gap:8px;margin-top:4px}
.pv-sub-grid-2{grid-template-columns:1fr 1fr}
.pv-sub-grid-3{grid-template-columns:1fr 1fr 1fr}
@media(max-width:600px){.pv-sub-grid,.pv-sub-grid-2,.pv-sub-grid-3{grid-template-columns:1fr}}
.pv-sub-card{padding:8px 10px 10px;background:#f6faf7;border:1px solid #c8e4d4;border-top:2px solid #8ecfb4;border-radius:0 0 6px 6px;cursor:pointer;transition:background .15s}
.pv-sub-card:hover{background:#ecf7f2}
.pv-sub-label{font-size:10px;font-weight:700;color:#1e5b4f;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;display:flex;align-items:center;gap:4px}
.pv-sec-empty{font-size:11px;color:#bbb;font-style:italic;padding:4px 0}
.pv-active{outline:2px solid #611232 !important;outline-offset:2px}
.pv-elem-wrap{cursor:pointer;border-radius:3px;transition:outline .15s}
.pv-elem-wrap:hover{outline:1.5px dashed #c9a76c;outline-offset:2px}
`

const eid = (id) => String(id).replace(/'/g, "\\'")

// ── renderElem: ahora envuelve cada elemento en un div con data-elem-id ──
function renderElem(elem, secId, subId) {
  const { tipo, contenido, html, align, _fileUrl, id, font } = elem

  // CORRECCIÓN: aplicar font-family en el preview según elem.font
  // ANTES: elem.font se ignoraba → la fuente nunca cambiaba en el preview
  // AHORA: se mapea 'noto-sans' y 'patria' a sus font-family CSS reales
  const FONT_MAP = { 'noto-sans': '"Noto Sans",sans-serif', 'patria': 'Georgia,serif' }
  const fontCss  = (font && FONT_MAP[font]) ? `font-family:${FONT_MAP[font]};` : ''
  const as       = align ? `text-align:${align};` : ''
  const inlineStyle = as + fontCss  // combinar alineación + fuente

  const v     = html || contenido || ''
  const empty = `<em style="color:#ccc;font-size:11px">(vacío)</em>`
  const d     = v || empty

  const secAttr = secId ? ` data-pv-sec-id="${eid(secId)}"` : ''
  const subAttr = subId ? ` data-sub-id="${eid(subId)}"` : ''
  const wrapOpen  = `<div class="pv-elem-wrap" data-elem-id="${eid(id)}"${secAttr}${subAttr}>`
  const wrapClose = `<span class="pv-inspect-hint" style="font-size:9px;display:block;text-align:right">✏ editar</span></div>`

  let inner = ''
  switch (tipo) {
    // inlineStyle incluye text-align + font-family
    case 'h1':   inner = `<h1 class="doc-h1" style="${inlineStyle}">${d}</h1>`; break
    case 'h2':   inner = `<h2 class="doc-h2" style="${inlineStyle}">${d}</h2>`; break
    case 'h3':   inner = `<h3 class="doc-h3" style="${inlineStyle}">${d}</h3>`; break
    case 'p':    inner = `<p class="doc-p" style="${inlineStyle}">${d}</p>`; break
    case 'hl':   inner = `<div class="doc-highlight" style="display:flex;gap:8px;align-items:flex-start;${inlineStyle}"><span style="font-size:16px;flex-shrink:0;line-height:1.4">⚠</span><div style="flex:1">${d}</div></div>`; break
    case 'note': inner = `<blockquote class="doc-note" style="${inlineStyle}">${d}</blockquote>`; break
    case 'hr':   inner = `<hr class="doc-hr">`; break
    case 'url': {
      const textoUrl = elem.anchorText || contenido || empty
      inner = `<div style="${as}"><a class="doc-url" href="#">${textoUrl}</a></div>`
      break
    }
    case 'mail': inner = `<div style="${as}"><a class="doc-mailto" href="#">` +
      `<svg width="13" height="11" viewBox="0 0 22 18" fill="none" style="vertical-align:middle;margin-right:3px">` +
      `<rect x="1" y="1" width="20" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6"/>` +
      `<path d="M1 4l10 7 10-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>` +
      `${contenido||empty}</a></div>`; break
    case 'img':
      if (_fileUrl) inner = `<div style="${as}"><img src="${_fileUrl}" alt="${contenido||''}" class="doc-img-full"></div>`
      else if (contenido) inner = `<div style="background:#f5e8d0;border:1.5px dashed #c9a76c;border-radius:6px;padding:10px;font-size:12px;color:#7b5800;text-align:center">🖼 ${contenido}</div>`
      else inner = `<div style="background:#f5f5f5;border:1.5px dashed #ccc;border-radius:6px;padding:10px;font-size:11px;color:#aaa;text-align:center">📷 imagen</div>`
      break
    default: inner = `<div style="${inlineStyle}">${d}</div>`
  }

  return wrapOpen + inner + wrapClose
}

// ── Calcular un "hash de contenido" para detectar cambios relevantes ──
// Más sensible que solo contar secciones: detecta cuando crece el texto.
function calcContentHash(secciones) {
  let total = 0
  secciones.forEach(sec => {
    total += (sec.elementos||[]).length
    ;(sec.elementos||[]).forEach(e => { total += (e.contenido||'').length })
    ;(sec.subsegmentos||[]).forEach(sub => {
      total += (sub.elementos||[]).length
      ;(sub.elementos||[]).forEach(e => { total += (e.contenido||'').length })
    })
  })
  return total
}

export default function PreviewPanel({ secciones, onNavegar, activeElemIdFromBuilder }) {
  const scrollRef      = useRef(null)
  const prevHashRef    = useRef(0)
  const prevSecLenRef  = useRef(0)

  // ── SCROLL 1: Auto-scroll cuando crece el contenido ──────
  // Antes: solo cuando aumentaba el número de secciones.
  // Ahora: cuando aumenta el hash total (secciones + elementos + texto).
  // Solo scrollea si el usuario ya estaba cerca del fondo.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const hash   = calcContentHash(secciones)
    const secLen = secciones.length
    const grew   = hash > prevHashRef.current || secLen > prevSecLenRef.current
    if (grew) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300
      if (isNearBottom || secLen > prevSecLenRef.current) {
        el.scrollTop = el.scrollHeight
      }
    }
    prevHashRef.current   = hash
    prevSecLenRef.current = secLen
  }, [secciones])

  // ── SCROLL 2: builder→preview — cuando se abre un elemento en el builder ──
  // El padre (App.jsx) pasa el ID del elemento que se acaba de abrir.
  // Hacemos scroll al div correspondiente en el preview.
  useEffect(() => {
    if (!activeElemIdFromBuilder || !scrollRef.current) return
    const target = scrollRef.current.querySelector(`[data-elem-id="${activeElemIdFromBuilder}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      // Flash visual para indicar cuál elemento corresponde
      target.style.transition = 'outline 0.15s'
      target.style.outline    = '2px solid #a57f2c'
      target.style.outlineOffset = '2px'
      setTimeout(() => { target.style.outline = ''; target.style.outlineOffset = '' }, 1200)
    }
  }, [activeElemIdFromBuilder])

  // ── Construir HTML del preview ────────────────────────────
  const html = useMemo(() => {
    if (!secciones.length) return ''
    return secciones.map((sec, si) => {
      const segN   = si + 1
      const secId  = sec.id
      const mode   = sec.layout || 'full'

      let inner = ''
      if (mode === 'full') {
        const elems = sec.elementos || []
        inner = elems.length
          ? elems.map(e => renderElem(e, secId, null)).join('')
          : `<div class="pv-sec-empty">— sin elementos —</div>`
      } else {
        const cols = mode === 'half' ? 2 : 3
        const subs = sec.subsegmentos || []
        const total = Math.max(subs.length, cols)
        let colsHtml = ''
        for (let i = 0; i < total; i++) {
          if (i < subs.length) {
            const sub    = subs[i]
            const subId  = sub.id
            const subName = sub.nombre || `Columna ${i+1}`
            const subContent = (sub.elementos||[]).length
              ? (sub.elementos||[]).map(e => renderElem(e, secId, subId)).join('')
              : `<div class="pv-sec-empty">— vacío —</div>`
            // data-sub-id en el label para abrir la columna completa
            colsHtml += `<div class="pv-sub-card" data-sub-id="${eid(subId)}" data-sec-id="${eid(secId)}">` +
              `<div class="pv-sub-label">${subName}<span class="pv-inspect-hint">🔍</span></div>` +
              subContent + `</div>`
          } else {
            colsHtml += `<div class="pv-sub-card"><div class="pv-sub-label">Columna ${i+1}</div><div class="pv-sec-empty">— vacío —</div></div>`
          }
        }
        inner = `<div class="pv-sub-grid pv-sub-grid-${cols}">${colsHtml}</div>`
      }

      return `<div class="pv-seg" data-pv-sec-id="${eid(secId)}">` +
        `<div class="pv-seg-label">` +
        `<span class="pv-seg-badge">SEG-${segN}</span>` +
        (sec.nombre ? `<span class="pv-seg-name">${sec.nombre}</span>` : '') +
        `<span class="pv-inspect-hint">🔍 clic para editar</span></div>` +
        inner + `</div>`
    }).join('')
  }, [secciones])

  // ── Delegación de eventos (clic en preview) ───────────────
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleClick = (e) => {
      // ── Prioridad 1: elemento individual ─────────────────
      const elemWrap = e.target.closest('[data-elem-id]')
      if (elemWrap) {
        e.stopPropagation()
        const elemId = elemWrap.dataset.elemId
        const secId  = elemWrap.dataset.pvSecId || elemWrap.closest('[data-pv-sec-id]')?.dataset?.pvSecId
        const subId  = elemWrap.dataset.subId

        // Resaltar en preview
        container.querySelectorAll('.pv-active').forEach(el => el.classList.remove('pv-active'))
        elemWrap.classList.add('pv-active')

        // Scroll al elemento en el builder (id="elemento-{id}")
        const builderEl = document.getElementById(`elemento-${elemId}`)
        if (builderEl) builderEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

        // Notificar: tipo='elemento' para que el builder lo abra
        if (onNavegar) onNavegar({ tipo: 'elemento', id: elemId, secId, subId })
        return
      }

      // ── Prioridad 2: columna (subsegmento) ───────────────
      const subCard = e.target.closest('[data-sub-id]')
      if (subCard) {
        e.stopPropagation()
        const subId = subCard.dataset.subId
        const secId = subCard.dataset.secId || subCard.closest('[data-pv-sec-id]')?.dataset?.pvSecId

        container.querySelectorAll('.pv-active').forEach(el => el.classList.remove('pv-active'))
        subCard.classList.add('pv-active')

        const builderEl = document.getElementById(`subsegmento-${subId}`)
        if (builderEl) builderEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

        if (onNavegar) onNavegar({ tipo: 'subsegmento', id: subId, secId })
        return
      }

      // ── Prioridad 3: segmento completo ────────────────────
      const seg = e.target.closest('[data-pv-sec-id]')
      if (seg) {
        const secId = seg.dataset.pvSecId

        container.querySelectorAll('.pv-active').forEach(el => el.classList.remove('pv-active'))
        seg.classList.add('pv-active')

        const builderEl = document.getElementById(`seccion-${secId}`)
        if (builderEl) builderEl.scrollIntoView({ behavior: 'smooth', block: 'start' })

        if (onNavegar) onNavegar({ tipo: 'seccion', id: secId })
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onNavegar])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitulo}>Vista Previa</span>
        <span className={styles.headerBadge}>EN VIVO</span>
        <span className={styles.headerHint}>✏ Clic para editar elemento</span>
      </div>
      <div className={styles.body} ref={scrollRef}>
        <style>{DOC_CSS}</style>
        <div className="doc-preview-body">
          {!secciones.length
            ? <div className={styles.vacio}>
                <div className={styles.vacioIco}>📄</div>
                <p>El documento está vacío.</p>
                <small>Agrega secciones para ver la previsualización aquí.</small>
              </div>
            : <div dangerouslySetInnerHTML={{ __html: html }} />
          }
        </div>
      </div>
    </div>
  )
}
