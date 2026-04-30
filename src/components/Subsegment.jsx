// Subsegment.jsx — v3
// ─────────────────────────────────────────────────────────
// Representa una columna (COL) dentro de un segmento multi-columna.
// Comportamiento idéntico al .sub-card del monolito v59:
//
//  ┌─ COL 1 ────────────────── ↑↓ ✕ ▸ ┐  ← cabecera, clic para expandir
//  │ [cerrado]                          │
//  └────────────────────────────────────┘
//  ┌─ COL 2 ────────────────── ↑↓ ✕ ▾ ┐  ← abierto
//  │  Nombre: _______________           │
//  │  ┌── Elemento 1 ──┐                │
//  │  └────────────────┘                │
//  │  [+ Agregar elemento]              │
//  └────────────────────────────────────┘
//
// Acordeón: al abrir un subsegmento el padre (Section) cierra los demás.
// Controlado por isOpen/onToggle desde Section.jsx.
// ─────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import TypeMenu          from './editor/TypeMenu'
import TitleEditor       from './editor/TitleEditor'
import TextEditor        from './editor/TextEditor'
import RichEditor        from './editor/RichEditor'
import SimpleFieldEditor from './editor/SimpleFieldEditor'
import { findType }      from './editor/elementTypes'
import styles from './Subsegment.module.css'

const CHIP_COLORS = {
  h1:'#611232', h2:'#9b2247', h3:'#1e5b4f', p:'#555',
  ul:'#a57f2c', ol:'#7b5800', 'ul-ol':'#8b3a00',
  hl:'#7b5800', note:'#611232', hr:'#888',
  url:'#1e5b4f', mail:'#880e4f', img:'#a57f2c',
}

// ── Preview compacto para elementos cerrados ──────────────
function PreviewCompacto({ elemento }) {
  const { tipo, contenido, html, align } = elemento
  const aStyle = { textAlign: align || 'left' }

  if (tipo === 'hl') return (
    <div style={{ background:'#fffde7', borderLeft:'3px solid #f9a825', padding:'6px 10px', fontSize:'12px', color:'#5f4700', borderRadius:'3px', ...aStyle }}>
      <span style={{ marginRight:'5px' }}>⚠</span>
      <span dangerouslySetInnerHTML={{ __html: html || contenido || '' }} />
    </div>
  )
  if (tipo === 'note') return (
    <blockquote style={{ borderLeft:'3px solid #611232', margin:0, padding:'6px 10px', background:'#fdf5f7', fontSize:'12px', color:'#333', fontStyle:'italic', borderRadius:'0 3px 3px 0' }}>
      <div dangerouslySetInnerHTML={{ __html: html || contenido || '' }} />
    </blockquote>
  )
  if (['ul','ol','ul-ol'].includes(tipo)) return (
    <div style={{ fontSize:'12px', color:'#333', paddingLeft:'4px', ...aStyle }}
      dangerouslySetInnerHTML={{ __html: html || contenido || '' }} />
  )
  if (tipo === 'p') return (
    <div style={{ fontSize:'12px', color:'#333', lineHeight:1.5, ...aStyle }}
      dangerouslySetInnerHTML={{ __html: html || contenido || '' }} />
  )
  if (['h1','h2','h3'].includes(tipo)) return (
    <div style={{ fontSize: tipo==='h1'?15:tipo==='h2'?13:12, fontWeight:700,
      color: tipo==='h1'?'#611232':tipo==='h2'?'#9b2247':'#1e5b4f', ...aStyle }}>
      {contenido || ''}
    </div>
  )
  if (tipo === 'hr') return <hr style={{ border:'none', borderTop:'2px solid #d0b090', margin:'4px 0' }} />
  if (tipo === 'url' && contenido) return (
    <div style={{ color:'#1e5b4f', fontSize:'12px', display:'flex', gap:'4px', alignItems:'center' }}>
      <svg width="11" height="11" viewBox="0 0 22 22" fill="none"><path d="M8 14l6-6M10.5 7.5l1.5-1.5a3.5 3.5 0 014.95 4.95l-1.5 1.5" stroke="#1e5b4f" strokeWidth="1.8" strokeLinecap="round"/><path d="M11.5 14.5l-1.5 1.5A3.5 3.5 0 015.05 11L6.5 9.5" stroke="#1e5b4f" strokeWidth="1.8" strokeLinecap="round"/></svg>
      <span style={{ textDecoration:'underline', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'200px' }}>{contenido}</span>
    </div>
  )
  if (tipo === 'mail' && contenido) return (
    <div style={{ color:'#880e4f', fontSize:'12px', display:'flex', gap:'5px', alignItems:'center' }}>
      <svg width="13" height="11" viewBox="0 0 22 18" fill="none"><rect x="1" y="1" width="20" height="16" rx="2.5" stroke="#880e4f" strokeWidth="1.6"/><path d="M1 4l10 7 10-7" stroke="#880e4f" strokeWidth="1.6" strokeLinecap="round"/></svg>
      <span style={{ textDecoration:'underline' }}>{contenido}</span>
    </div>
  )
  return null
}

// ── Editor según tipo ─────────────────────────────────────
function ElemEditor({ elemento, onUpdate, onFileSelected }) {
  const info = findType(elemento.tipo)
  const tipo = elemento.tipo
  const PH = { ul:'Primer punto...', ol:'Primer paso...', 'ul-ol':'Primer punto...', hl:'Aviso importante...', note:'Nota complementaria...' }

  if (['h1','h2','h3'].includes(tipo))
    return <TitleEditor contenido={elemento.contenido||''} align={elemento.align||info.defAlign||'left'} font={elemento.font||''} cssClases={elemento.cssClases||info.cssClases} onChange={onUpdate}/>
  if (tipo === 'p')
    return <TextEditor html={elemento.html||''} align={elemento.align||'justify'} font={elemento.font||''} cssClases={elemento.cssClases||info.cssClases} onChange={({html,align,font,cssClases})=>onUpdate({html,align,font,cssClases,contenido:new DOMParser().parseFromString(html,'text/html').body.textContent||''})}/>
  if (['ul','ol','ul-ol','hl','note'].includes(tipo))
    return <RichEditor tipo={tipo} html={elemento.html||''} align={elemento.align||info.defAlign||'left'} font={elemento.font||''} cssClases={elemento.cssClases||info.cssClases} hasListBar={info.hasListBar} hasFormatBar={true} placeholder={PH[tipo]||'Escribe aquí...'} onChange={({html,align,font,cssClases})=>onUpdate({html,align,font,cssClases,contenido:new DOMParser().parseFromString(html,'text/html').body.textContent||''})}/>
  if (['url','mail','img','hr'].includes(tipo))
    return <SimpleFieldEditor tipo={tipo} contenido={elemento.contenido||''} align={elemento.align||info.defAlign||'left'} cssClases={elemento.cssClases||info.cssClases} onChange={({contenido,align,cssClases,anchorText})=>onUpdate({contenido,align,cssClases,anchorText})} onFileSelected={tipo==='img'?(file)=>{ onUpdate({ contenido:file.name, _fileUrl:URL.createObjectURL(file) }); if(onFileSelected) onFileSelected(file) }:undefined}/>
  return null
}

// ─────────────────────────────────────────────────────────
// SUBSEGMENTO PRINCIPAL
// ─────────────────────────────────────────────────────────
export default function Subsegment({
  sub, subIndex, isOpen, onToggle,
  onMover, canArriba, canAbajo,
  onUpdate, onDelete, onFileSelected,
  activeElemIdFromPreview,
}) {
  // Acordeón LOCAL de elementos: solo 1 abierto a la vez
  const [activeElem, setActiveElem] = useState(null)

  // Abrir elemento cuando viene clic del preview principal
  useEffect(() => {
    if (!activeElemIdFromPreview) return
    const idx = (sub.elementos||[]).findIndex(e => e.id === activeElemIdFromPreview)
    if (idx !== -1) {
      setActiveElem(idx)
      setTimeout(() => {
        const el = document.getElementById(`elemento-${activeElemIdFromPreview}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }, [activeElemIdFromPreview, sub.elementos])
  const genId = () => `elem_${Date.now()}_${Math.floor(Math.random()*1000)}`

  // ── CRUD elementos ────────────────────────────────────
  const agregarElemento = (_, tipo) => {
    const info = findType(tipo)
    const nuevos = [...(sub.elementos||[]), {
      id:genId(), tipo, contenido:'', html:'',
      align:info.defAlign||'left', font:'', cssClases:info.cssClases||'',
    }]
    onUpdate(sub.id, { ...sub, elementos: nuevos })
    setActiveElem(nuevos.length - 1)
  }

  const actualizarElemento = (elemId, cambios) =>
    onUpdate(sub.id, { ...sub, elementos:(sub.elementos||[]).map(el=>el.id===elemId?{...el,...cambios}:el) })

  const eliminarElemento = (elemId) => {
    onUpdate(sub.id, { ...sub, elementos:(sub.elementos||[]).filter(el=>el.id!==elemId) })
    setActiveElem(null)
  }

  const moverElemento = (idx, dir) => {
    const dest = idx + dir; const arr = [...(sub.elementos||[])]
    if (dest < 0 || dest >= arr.length) return
    ;[arr[idx], arr[dest]] = [arr[dest], arr[idx]]
    onUpdate(sub.id, { ...sub, elementos: arr })
    setActiveElem(dest)
  }

  const toggleElem = (idx) => setActiveElem(prev => prev === idx ? null : idx)

  return (
    <div className={styles.subCard} id={`subsegmento-${sub.id}`}>
      {/* ── Cabecera — clic para expandir/colapsar ── */}
      <div className={styles.subHead} onClick={onToggle}>
        <span className={styles.subNum}>COL {subIndex + 1}</span>
        <span className={styles.subNombre}>
          {sub.nombre || `Columna ${subIndex + 1}`}
        </span>
        {(sub.elementos||[]).length > 0 && (
          <span className={styles.subCount}>{(sub.elementos||[]).length} elem.</span>
        )}
        <div className={styles.subActions} onClick={e => e.stopPropagation()}>
          <button className={styles.bico} onClick={() => onMover(-1)} disabled={!canArriba} title="Mover columna izquierda">↑</button>
          <button className={styles.bico} onClick={() => onMover(1)}  disabled={!canAbajo}  title="Mover columna derecha">↓</button>
          <button className={`${styles.bico} ${styles.bicoDanger}`} onClick={() => onDelete(sub.id)} title="Eliminar columna">✕</button>
        </div>
        <span className={styles.subArrow}>{isOpen ? '▾' : '▸'}</span>
      </div>

      {/* ── Cuerpo — solo visible si isOpen ── */}
      {isOpen && (
        <div className={styles.subBody}>
          {/* Nombre de la columna */}
          {/* <div className={styles.campo}>
            <label>Nombre de la columna</label>
            <input type="text" value={sub.nombre || ''}
              placeholder={`Columna ${subIndex + 1}`}
              onChange={e => onUpdate(sub.id, { ...sub, nombre: e.target.value })} />
          </div> */}

          {/* Lista de elementos con acordeón */}
          <div className={styles.elemLista}>
            {(sub.elementos||[]).length === 0
              ? <p className={styles.listaVacia}>Sin elementos. Usa el menú de abajo.</p>
              : (sub.elementos||[]).map((elem, idx) => (
                  <div key={elem.id}
                    className={styles.elemCard}
                    id={`elemento-${elem.id}`}>

                    {/* Cabecera del elemento */}
                    <div className={styles.elemHead} onClick={() => toggleElem(idx)}>
                      <span className={styles.chip}
                        style={{ background: CHIP_COLORS[elem.tipo] || '#555' }}>
                        {findType(elem.tipo).label}
                      </span>
                      {/* Resumen cuando está cerrado */}
                      {activeElem !== idx && (
                        <span className={styles.elemResumen}>
                          {elem.contenido
                            ? elem.contenido.substring(0, 55) + (elem.contenido.length > 55 ? '…' : '')
                            : <em style={{ color:'#bbb', fontSize:'11px' }}>Sin contenido</em>
                          }
                        </span>
                      )}
                      <div className={styles.elemActions} onClick={e => e.stopPropagation()}>
                        <button className={styles.bico} onClick={() => moverElemento(idx,-1)} disabled={idx===0} title="Subir">↑</button>
                        <button className={styles.bico} onClick={() => moverElemento(idx,1)}  disabled={idx===(sub.elementos||[]).length-1} title="Bajar">↓</button>
                        <button className={`${styles.bico} ${styles.bicoDanger}`} onClick={() => eliminarElemento(elem.id)} title="Eliminar">✕</button>
                      </div>
                      <span className={styles.elemArrow}>{activeElem===idx ? '▾' : '▸'}</span>
                    </div>

                    {/* Editor del elemento — solo cuando está abierto */}
                    {activeElem === idx && (
                      <div className={styles.elemBody}>
                        <ElemEditor elemento={elem}
                          onUpdate={cambios => actualizarElemento(elem.id, cambios)}
                          onFileSelected={file => onFileSelected && onFileSelected(elem.id, file)} />
                        {/* Mini preview debajo del editor */}
                        <div className={styles.prevWrap}>
                          <span className={styles.prevLbl}>👁 Vista previa</span>
                          <div className={styles.prevBox}>
                            <PreviewCompacto elemento={elem} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
            }
          </div>

          {/* Menú para agregar elementos */}
          <TypeMenu seccionId={sub.id} onAgregar={agregarElemento} />
        </div>
      )}
    </div>
  )
}
