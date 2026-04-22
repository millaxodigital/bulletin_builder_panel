import { useState } from 'react'
import TextEditor  from './editor/TextEditor'
import TitleEditor from './editor/TitleEditor'
import styles from './Section.module.css'

function CssTagsPreview({ valor }) {
  if (!valor) return null
  return (
    <div className={styles.cssPreview}>
      {valor.split(' ').filter(Boolean).map((cls) => (
        <span key={cls} className={styles.cssTag}>{cls}</span>
      ))}
    </div>
  )
}

function ElementoItem({ elemento, onUpdateElemento, onDeleteElemento }) {
  return (
    <div className={styles.elementoCard}>
      <div className={styles.elementoHead}>
        <span className={`${styles.chip} ${elemento.tipo === 'titulo' ? styles.chipTitulo : styles.chipParrafo}`}>
          {elemento.tipo === 'titulo'
            ? <><span className={styles.chipT}>T</span> Título</>
            : <>¶ Párrafo</>
          }
        </span>
        <button
          className={styles.btnEliminar}
          onClick={() => onDeleteElemento(elemento.id)}
          title="Eliminar elemento"
        >✕</button>
      </div>

      <div className={styles.elementoBody}>
        {elemento.tipo === 'titulo' ? (
          <TitleEditor
            contenido={elemento.contenido || ''}
            align={elemento.align || 'left'}
            font={elemento.font || ''}
            cssClases={elemento.cssClases || 'doc-h2'}
            onChange={({ contenido, align, font, cssClases }) =>
              onUpdateElemento(elemento.id, { contenido, align, font, cssClases })
            }
          />
        ) : (
          <TextEditor
            html={elemento.html || ''}
            align={elemento.align || 'justify'}
            font={elemento.font || ''}
            cssClases={elemento.cssClases || 'doc-p'}
            onChange={({ html, align, font, cssClases }) =>
              onUpdateElemento(elemento.id, {
                html, align, font, cssClases,
                contenido: new DOMParser()
                  .parseFromString(html, 'text/html')
                  .body.textContent || '',
              })
            }
          />
        )}
      </div>
    </div>
  )
}

function Section({ section, sectionIndex, onUpdate, onDelete }) {
  const [abierta, setAbierta] = useState(true)
  const generarId = () => `elem_${Date.now()}_${Math.floor(Math.random() * 1000)}`

  const agregarElemento = (tipo) => {
    onUpdate(section.id, {
      ...section,
      elementos: [...section.elementos, {
        id: generarId(), tipo,
        contenido: '', html: '',
        align: tipo === 'titulo' ? 'left' : 'justify',
        font: '',
        cssClases: tipo === 'titulo' ? 'doc-h2' : 'doc-p',
      }],
    })
  }

  const actualizarElemento = (elemId, cambios) => {
    onUpdate(section.id, {
      ...section,
      elementos: section.elementos.map((el) =>
        el.id === elemId ? { ...el, ...cambios } : el
      ),
    })
  }

  const eliminarElemento = (elemId) => {
    onUpdate(section.id, {
      ...section,
      elementos: section.elementos.filter((el) => el.id !== elemId),
    })
  }

  const actualizarCampo = (campo, valor) =>
    onUpdate(section.id, { ...section, [campo]: valor })

  return (
    <div className={styles.seccionCard}>
      <div className={styles.seccionHead} onClick={() => setAbierta(!abierta)}>
        <span className={styles.seccionNum}>SEG-{sectionIndex + 1}</span>
        <span className={styles.seccionNombre}>
          {section.nombre || `Sección ${sectionIndex + 1}`}
        </span>
        <span className={styles.seccionArrow}>{abierta ? '▾' : '▸'}</span>
        <button
          className={styles.btnEliminarSeccion}
          onClick={(e) => { e.stopPropagation(); onDelete(section.id) }}
          title="Eliminar sección"
        >🗑</button>
      </div>

      {abierta && (
        <div className={styles.seccionBody}>
          <div className={styles.campo}>
            <label>Nombre de la sección</label>
            <input
              type="text"
              value={section.nombre}
              placeholder={`Sección ${sectionIndex + 1}`}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
            />
          </div>
          <div className={styles.campo}>
            <label>
              Clases CSS del contenedor
              <span className={styles.labelHint}> (ej: doc-section)</span>
            </label>
            <input
              type="text"
              value={section.cssClases}
              placeholder="doc-section"
              onChange={(e) => actualizarCampo('cssClases', e.target.value)}
              className={styles.inputMono}
            />
            <CssTagsPreview valor={section.cssClases} />
          </div>

          <div className={styles.elementosLista}>
            {section.elementos.length === 0
              ? <p className={styles.listaVacia}>No hay elementos. Agrega un título o párrafo.</p>
              : section.elementos.map((elem) => (
                  <ElementoItem
                    key={elem.id}
                    elemento={elem}
                    onUpdateElemento={actualizarElemento}
                    onDeleteElemento={eliminarElemento}
                  />
                ))
            }
          </div>

          <div className={styles.botonesAgregar}>
            <span className={styles.botonesLabel}>+ Agregar:</span>
            <button className={styles.btnAgregarTitulo} onClick={() => agregarElemento('titulo')}>
              <span className={styles.btnTIcon}>T</span> Título
            </button>
            <button className={styles.btnAgregarParrafo} onClick={() => agregarElemento('parrafo')}>
              ¶ Párrafo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Section
