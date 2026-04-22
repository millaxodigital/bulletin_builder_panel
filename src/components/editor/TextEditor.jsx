import { useRef, useState, useEffect } from 'react'
import Toolbar       from './Toolbar'
import StyleSelector from './StyleSelector'
import { applyCase, applyRichCase } from '../../utils/caseUtils'
import styles from './TextEditor.module.css'

const ALIGN_CLASS = { left:'text-left', center:'text-center', right:'text-right', justify:'text-justify' }
const FONT_FAMILY  = { 'noto-sans':'"Noto Sans", sans-serif', 'patria':'Georgia, "Times New Roman", serif' }

export default function TextEditor({ html, align, font, cssClases, onChange }) {
  const editorRef = useRef(null)

  const [activeFormats, setActiveFormats] = useState({ bold:false, italic:false, underline:false, hiliteColor:false })
  const [previewHtml, setPreviewHtml]     = useState(html || '')

  // Solo al montar — NO depender de [html] o React sobreescribe mientras el usuario escribe
  useEffect(() => {
    const ed = editorRef.current
    if (ed) ed.innerHTML = html || ''
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const notificar = (extras = {}) => {
    const ed = editorRef.current
    if (!ed) return
    const base     = (cssClases || '').replace(/\b(text-left|text-center|text-right|text-justify|noto-sans|patria)\b/g, '').trim()
    const fontCls  = extras.font  !== undefined ? extras.font  : (font  || '')
    const alignVal = extras.align !== undefined ? extras.align : (align || 'justify')
    const alignCls = ALIGN_CLASS[alignVal] || ''
    const parts    = [base, fontCls, alignCls].filter(Boolean)
    const nuevoHtml = ed.innerHTML
    setPreviewHtml(nuevoHtml)
    onChange({ html: nuevoHtml, align: alignVal, font: fontCls, cssClases: [...new Set(parts)].join(' ') })
  }

  const detectarFormatos = () => setActiveFormats({
    bold:        document.queryCommandState('bold'),
    italic:      document.queryCommandState('italic'),
    underline:   document.queryCommandState('underline'),
    hiliteColor: document.queryCommandState('hiliteColor'),
  })

  const handleFormat = (cmd, value = null) => {
    const ed = editorRef.current
    if (!ed) return
    ed.focus()
    if (cmd === 'bold') {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        const b = document.createElement('b')
        b.style.color = '#3a0a0a'
        try { range.surroundContents(b) } catch { document.execCommand('bold', false, null) }
      } else { document.execCommand('bold', false, null) }
    } else { document.execCommand(cmd, false, value) }
    detectarFormatos()
    notificar()
  }

  const handleAlign = (val)      => notificar({ align: val })
  const handleFont  = (newFont)  => notificar({ font: newFont })

  const handleCase = (modo) => {
    const ed = editorRef.current
    if (!ed) return
    ed.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('insertText', false, applyCase(sel.getRangeAt(0).toString(), modo))
    } else {
      applyRichCase(ed, modo)
    }
    notificar()
  }

  return (
    <div className={styles.editorWrap}>
      <Toolbar onFormat={handleFormat} onAlign={handleAlign} onCase={handleCase} align={align} activeFormats={activeFormats} />
      <div
        ref={editorRef}
        className={styles.editor}
        style={{ textAlign: align || 'justify', fontFamily: FONT_FAMILY[font] || 'inherit' }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Escribe el párrafo aquí..."
        onInput={() => { detectarFormatos(); notificar() }}
        onKeyUp={detectarFormatos}
        onMouseUp={detectarFormatos}
        onFocus={detectarFormatos}
      />
      <StyleSelector font={font} onFontChange={handleFont} previewHtml={previewHtml} />
    </div>
  )
}
