import { useRef } from 'react'
import AlignButtons  from './AlignButtons'
import CaseButtons   from './CaseButtons'
import StyleSelector from './StyleSelector'
import { applyCase } from '../../utils/caseUtils'
import styles from './TitleEditor.module.css'

const ALIGN_CLASS = { left:'text-left', center:'text-center', right:'text-right', justify:'text-justify' }
const FONT_FAMILY  = { 'noto-sans':'"Noto Sans", sans-serif', 'patria':'Georgia, "Times New Roman", serif' }

export default function TitleEditor({ contenido, align, font, cssClases, onChange }) {
  const inputRef = useRef(null)

  const notificar = (extras = {}) => {
    const base     = (cssClases || '').replace(/\b(text-left|text-center|text-right|text-justify|noto-sans|patria)\b/g, '').trim()
    const fontCls  = extras.font      !== undefined ? extras.font      : (font  || '')
    const alignVal = extras.align     !== undefined ? extras.align     : (align || 'left')
    const newText  = extras.contenido !== undefined ? extras.contenido : contenido
    const alignCls = ALIGN_CLASS[alignVal] || ''
    const parts    = [base, fontCls, alignCls].filter(Boolean)
    onChange({ contenido: newText, align: alignVal, font: fontCls, cssClases: [...new Set(parts)].join(' ') })
  }

  const handleCase = (modo) => {
    const inp = inputRef.current
    if (!inp) return
    const { selectionStart: s, selectionEnd: e, value } = inp
    const resultado = (s !== e)
      ? value.slice(0, s) + applyCase(value.slice(s, e), modo) + value.slice(e)
      : applyCase(value, modo)
    notificar({ contenido: resultado })
    requestAnimationFrame(() => { inp.focus(); inp.setSelectionRange(s, s + (e - s)) })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.grupo}>
          <AlignButtons align={align} onAlign={(v) => notificar({ align: v })} />
        </div>
        <div className={styles.sep} />
        <div className={styles.grupo}>
          <CaseButtons onCase={handleCase} />
        </div>
      </div>
      <input
        ref={inputRef}
        type="text"
        className={styles.titleInput}
        value={contenido}
        placeholder="Escribe el título aquí..."
        style={{ textAlign: align || 'left', fontFamily: FONT_FAMILY[font] || 'inherit' }}
        onChange={(e) => notificar({ contenido: e.target.value })}
      />
      <StyleSelector font={font} onFontChange={(v) => notificar({ font: v })} previewText={contenido} />
    </div>
  )
}
