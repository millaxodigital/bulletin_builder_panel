// Section.jsx — Componente que representa UNA sección del documento
// Una sección puede tener: elementos de tipo "titulo" o "parrafo"
// Recibe por props:
//   - section: el objeto de datos { id, nombre, cssClases, elementos: [...] }
//   - onUpdate: función para notificar cambios al padre (BuilderPanel)
//   - onDelete: función para eliminar esta sección

import { useState } from 'react'
import styles from './Section.module.css'

// ─────────────────────────────────────────────
// Subcomponente: un elemento individual (título o párrafo)
// ─────────────────────────────────────────────
function ElementoItem({ elemento, onUpdateElemento, onDeleteElemento }) {
  // Cada elemento tiene: id, tipo ('titulo' | 'parrafo'), contenido, cssClases
  return (
    <div className={styles.elementoCard}>
      {/* Chip de tipo — muestra visualmente qué tipo es */}
      <div className={styles.elementoHead}>
        <span className={`${styles.chip} ${elemento.tipo === 'titulo' ? styles.chipTitulo : styles.chipParrafo}`}>
          {elemento.tipo === 'titulo' ? 'H2 Título' : '¶ Párrafo'}
        </span>
        <button
          className={styles.btnEliminar}
          onClick={() => onDeleteElemento(elemento.id)}
          title="Eliminar elemento"
        >
          ✕
        </button>
      </div>

      {/* Campo de contenido: input para título, textarea para párrafo */}
      <div className={styles.campo}>
        <label>Contenido</label>
        {elemento.tipo === 'titulo' ? (
          <input
            type="text"
            value={elemento.contenido}
            placeholder="Escribe el título aquí..."
            // onChange: cada vez que el usuario escribe, actualizamos el estado
            onChange={(e) =>
              onUpdateElemento(elemento.id, { contenido: e.target.value })
            }
          />
        ) : (
          <textarea
            value={elemento.contenido}
            placeholder="Escribe el párrafo aquí..."
            onChange={(e) =>
              onUpdateElemento(elemento.id, { contenido: e.target.value })
            }
            rows={3}
          />
        )}
      </div>

      {/* Campo de clases CSS — permite ingresar clases como "doc-h2 text-center" */}
      <div className={styles.campo}>
        <label>
          Clases CSS
          <span className={styles.labelHint}>(ej: doc-h2 text-center)</span>
        </label>
        <input
          type="text"
          value={elemento.cssClases}
          placeholder='doc-h2 text-center'
          onChange={(e) =>
            onUpdateElemento(elemento.id, { cssClases: e.target.value })
          }
          className={styles.inputMono}
        />
        {/* Vista previa de las clases ingresadas */}
        {elemento.cssClases && (
          <div className={styles.cssPreview}>
            {elemento.cssClases.split(' ').filter(Boolean).map((cls) => (
              <span key={cls} className={styles.cssTag}>{cls}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Componente principal: Section
// ─────────────────────────────────────────────
function Section({ section, sectionIndex, onUpdate, onDelete }) {
  // Estado local para controlar si el cuerpo de la sección está colapsado
  const [abierta, setAbierta] = useState(true)

  // ── Genera un ID único para nuevos elementos ──
  // Date.now() + Math.random() garantiza unicidad dentro de la sesión
  const generarId = () => `elem_${Date.now()}_${Math.floor(Math.random() * 1000)}`

  // ── Agregar un nuevo elemento a esta sección ──
  // Tipo puede ser 'titulo' o 'parrafo'
  const agregarElemento = (tipo) => {
    const nuevoElemento = {
      id: generarId(),
      tipo,           // 'titulo' | 'parrafo'
      contenido: '',  // Empieza vacío, el usuario escribe
      cssClases: tipo === 'titulo' ? 'doc-h2' : 'doc-p', // Valor por defecto
    }

    // onUpdate le avisa al padre (BuilderPanel) que esta sección cambió
    // Spread operator (...) copia todos los campos existentes y solo modifica "elementos"
    onUpdate(section.id, {
      ...section,
      elementos: [...section.elementos, nuevoElemento],
    })
  }

  // ── Actualizar un elemento específico dentro de esta sección ──
  // elemId: cuál elemento cambió
  // cambios: objeto con los campos que cambiaron (ej: { contenido: "nuevo texto" })
  const actualizarElemento = (elemId, cambios) => {
    onUpdate(section.id, {
      ...section,
      // map() recorre todos los elementos y solo modifica el que coincide con elemId
      elementos: section.elementos.map((el) =>
        el.id === elemId ? { ...el, ...cambios } : el
      ),
    })
  }

  // ── Eliminar un elemento de esta sección ──
  const eliminarElemento = (elemId) => {
    onUpdate(section.id, {
      ...section,
      // filter() devuelve una nueva lista SIN el elemento eliminado
      elementos: section.elementos.filter((el) => el.id !== elemId),
    })
  }

  // ── Actualizar campos de la sección (nombre, cssClases) ──
  const actualizarCampoSeccion = (campo, valor) => {
    onUpdate(section.id, { ...section, [campo]: valor })
  }

  return (
    <div className={styles.seccionCard}>
      {/* ── Cabecera de la sección ── */}
      <div className={styles.seccionHead} onClick={() => setAbierta(!abierta)}>
        <span className={styles.seccionNum}>SEG-{sectionIndex + 1}</span>
        <span className={styles.seccionNombre}>
          {section.nombre || `Sección ${sectionIndex + 1}`}
        </span>
        <span className={styles.seccionArrow}>{abierta ? '▾' : '▸'}</span>
        {/* El botón eliminar no debe propagar el click al head (colapsar) */}
        <button
          className={styles.btnEliminarSeccion}
          onClick={(e) => {
            e.stopPropagation() // Evita que el click llegue al div padre
            onDelete(section.id)
          }}
          title="Eliminar sección"
        >
          🗑
        </button>
      </div>

      {/* ── Cuerpo de la sección (colapsable) ── */}
      {abierta && (
        <div className={styles.seccionBody}>
          {/* Nombre de la sección */}
          <div className={styles.campo}>
            <label>Nombre de la sección</label>
            <input
              type="text"
              value={section.nombre}
              placeholder={`Sección ${sectionIndex + 1}`}
              onChange={(e) => actualizarCampoSeccion('nombre', e.target.value)}
            />
          </div>

          {/* Clases CSS de la sección completa */}
          <div className={styles.campo}>
            <label>
              Clases CSS del contenedor
              <span className={styles.labelHint}>(ej: doc-section bg-light)</span>
            </label>
            <input
              type="text"
              value={section.cssClases}
              placeholder='doc-section'
              onChange={(e) => actualizarCampoSeccion('cssClases', e.target.value)}
              className={styles.inputMono}
            />
            {section.cssClases && (
              <div className={styles.cssPreview}>
                {section.cssClases.split(' ').filter(Boolean).map((cls) => (
                  <span key={cls} className={styles.cssTag}>{cls}</span>
                ))}
              </div>
            )}
          </div>

          {/* Lista de elementos */}
          <div className={styles.elementosLista}>
            {section.elementos.length === 0 ? (
              <p className={styles.listaVacia}>
                No hay elementos. Agrega un título o párrafo.
              </p>
            ) : (
              section.elementos.map((elem) => (
                <ElementoItem
                  key={elem.id} // key es obligatorio en listas React (identificador único)
                  elemento={elem}
                  onUpdateElemento={actualizarElemento}
                  onDeleteElemento={eliminarElemento}
                />
              ))
            )}
          </div>

          {/* Botones para agregar elementos */}
          <div className={styles.botonesAgregar}>
            <span className={styles.botonesLabel}>+ Agregar:</span>
            <button
              className={styles.btnAgregarTitulo}
              onClick={() => agregarElemento('titulo')}
            >
              H2 Título
            </button>
            <button
              className={styles.btnAgregarParrafo}
              onClick={() => agregarElemento('parrafo')}
            >
              ¶ Párrafo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Section
