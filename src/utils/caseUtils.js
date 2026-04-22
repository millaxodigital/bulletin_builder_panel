export function applyCase(texto, modo) {
  if (!texto) return texto
  switch (modo) {
    case 'upper':   return texto.toUpperCase()
    case 'lower':   return texto.toLowerCase()
    case 'title':
      return texto.replace(/\p{L}\S*/gu, (w) =>
        w.charAt(0).toLocaleUpperCase('es') + w.slice(1).toLocaleLowerCase('es')
      )
    case 'sentence':
      return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1).toLocaleLowerCase('es')
    default: return texto
  }
}

export function applyRichCase(editorEl, modo) {
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT, null)
  const nodos = []
  let n = walker.nextNode()
  while (n) { nodos.push(n); n = walker.nextNode() }
  if (!nodos.length) return

  if (modo === 'sentence') {
    const full = nodos.map((n) => n.textContent).join('')
    const transformed = applyCase(full, 'sentence')
    let cursor = 0
    nodos.forEach((n) => {
      const len = n.textContent.length
      n.textContent = transformed.slice(cursor, cursor + len)
      cursor += len
    })
  } else {
    nodos.forEach((n) => { n.textContent = applyCase(n.textContent, modo) })
  }
}
