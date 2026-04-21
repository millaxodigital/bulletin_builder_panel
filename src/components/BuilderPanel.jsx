// BuilderPanel.jsx — Componente principal del constructor
// ─────────────────────────────────────────────────────────
// CONCEPTO CLAVE: Este componente es el "cerebro" de la aplicación.
// Él guarda el estado global (todas las secciones) y se lo pasa
// a los hijos como props. Los hijos le avisan cuando algo cambia.
//
// Flujo de datos:
//   BuilderPanel (estado) → Section (props) → ElementoItem (props)
//   ElementoItem (onChange) → Section (callback) → BuilderPanel (setState)
// ─────────────────────────────────────────────────────────

import { useState } from 'react'
import Section from './Section'
import styles from './BuilderPanel.module.css'

function BuilderPanel() {
  // ══════════════════════════════════════════════
  // ESTADO — El corazón del componente
  // ══════════════════════════════════════════════
  //
  // useState devuelve un par [valor, función para cambiarlo]
  // Cada vez que llamamos setSecciones(...), React re-renderiza
  // el componente con el nuevo valor.
  //
  // Estructura de cada sección:
  // {
  //   id: "sec_1234_567",     ← ID único generado al crear
  //   nombre: "Introducción", ← Nombre editable
  //   cssClases: "doc-section bg-light", ← Clases CSS del contenedor
  //   elementos: [            ← Lista de títulos y párrafos
  //     {
  //       id: "elem_8901_234",
  //       tipo: "titulo",        ← 'titulo' | 'parrafo'
  //       contenido: "Hola",
  //       cssClases: "doc-h2 text-center"
  //     },
  //     ...
  //   ]
  // }
  const [secciones, setSecciones] = useState([])

  // Estado para mostrar/ocultar la vista del JSON generado
  const [mostrarJson, setMostrarJson] = useState(false)
  const [jsonGenerado, setJsonGenerado] = useState(null)

  // ══════════════════════════════════════════════
  // GENERADOR DE IDs ÚNICOS
  // ══════════════════════════════════════════════
  // Combinamos timestamp + número random para evitar colisiones
  const generarId = (prefijo = 'id') =>
    `${prefijo}_${Date.now()}_${Math.floor(Math.random() * 1000)}`

  // ══════════════════════════════════════════════
  // AGREGAR SECCIÓN
  // ══════════════════════════════════════════════
  const agregarSeccion = () => {
    const nuevaSeccion = {
      id: generarId('sec'),
      nombre: '',
      cssClases: 'doc-section',   // Clase CSS por defecto para el contenedor
      elementos: [],
    }

    // setSecciones recibe la lista anterior y le añade la nueva al final
    // [...secciones, nuevaSeccion] = spread: copia todo lo anterior + agrega al final
    setSecciones((prev) => [...prev, nuevaSeccion])
  }

  // ══════════════════════════════════════════════
  // ACTUALIZAR UNA SECCIÓN EXISTENTE
  // ══════════════════════════════════════════════
  // secId: el ID de la sección a modificar
  // datosNuevos: el objeto completo de la sección con los cambios aplicados
  const actualizarSeccion = (secId, datosNuevos) => {
    setSecciones((prev) =>
      // map() recorre todas las secciones y reemplaza solo la que coincide
      prev.map((sec) => (sec.id === secId ? datosNuevos : sec))
    )
  }

  // ══════════════════════════════════════════════
  // ELIMINAR UNA SECCIÓN
  // ══════════════════════════════════════════════
  const eliminarSeccion = (secId) => {
    setSecciones((prev) =>
      // filter() devuelve todas EXCEPTO la que tiene el secId dado
      prev.filter((sec) => sec.id !== secId)
    )
  }

  // ══════════════════════════════════════════════
  // GUARDAR — Genera el JSON con toda la estructura
  // ══════════════════════════════════════════════
  const guardar = () => {
    if (secciones.length === 0) {
      alert('⚠️ Agrega al menos una sección antes de guardar.')
      return
    }

    // ── Construimos el JSON plano compatible con la estructura DB ──
    // Recorremos cada sección y cada elemento para generar
    // la lista bulletin_sections (filas para INSERT en DB)
    const bulletin_sections = []
    let orden = 1

    secciones.forEach((sec, secIndex) => {
      sec.elementos.forEach((elem) => {
        bulletin_sections.push({
          // section_segment: número de sección (1-based)
          section_segment: secIndex + 1,
          // section_subsegment: 0 = sin columnas (layout 'full')
          section_subsegment: 0,
          bull_id: null,                // Se asigna al insertar en DB
          // path_id: null para títulos y párrafos simples
          path_id: null,
          // section_content: el texto que escribió el usuario
          section_content: elem.contenido,
          // section_css: las clases CSS del elemento, ej: "doc-h2 text-center"
          section_css: elem.cssClases,
          // section_html: HTML que se renderizaría (null por ahora)
          section_html: null,
          section_order: orden++,
          section_status: true,
          updated_by: 'SISTEMA',
          // Metadatos para identificar en la UI (no van a DB)
          _meta_seg_name: sec.nombre || `Sección ${secIndex + 1}`,
          _meta_seg_css: sec.cssClases,
          _meta_type: elem.tipo,        // 'titulo' | 'parrafo'
        })
      })
    })

    // ── Estructura jerárquica anidada (para visualización) ──
    const segmentos = secciones.map((sec, secIndex) => ({
      section_segment: secIndex + 1,
      seg_name: sec.nombre || `Sección ${secIndex + 1}`,
      seg_css: sec.cssClases,           // Clases CSS del contenedor de sección
      elementos: sec.elementos.map((elem) => ({
        tipo: elem.tipo,
        contenido: elem.contenido,
        section_css: elem.cssClases,    // Ej: "doc-h2 text-center"
      })),
    }))

    // ── Objeto final que se enviaría a la API ──
    const resultado = {
      bulletin: {
        bull_name: 'Documento sin título',
        bull_status: true,
        updated_by: 'SISTEMA',
      },
      bulletin_sections,
      // Vista anidada (útil para render en el front)
      _vista_anidada: { segmentos },
    }

    // Mostrar en consola (abre DevTools con F12 → pestaña Console)
    console.log('📦 JSON generado por BuilderPanel:')
    console.log(JSON.stringify(resultado, null, 2))

    // Guardar en estado para mostrarlo en pantalla
    setJsonGenerado(resultado)
    setMostrarJson(true)
  }

  // ══════════════════════════════════════════════
  // RENDER — Lo que React "dibuja" en pantalla
  // ══════════════════════════════════════════════
  return (
    <div className={styles.panel}>

      {/* ── Barra superior ── */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.topbarLogo}>📄</span>
          <span className={styles.topbarTitulo}>Builder Panel</span>
          <span className={styles.topbarBadge}>React + Vite</span>
        </div>
        <button className={styles.btnGuardar} onClick={guardar}>
          💾 Guardar JSON
        </button>
      </div>

      {/* ── Contenido principal ── */}
      <div className={styles.contenido}>

        {/* ── Cabecera con botón agregar sección ── */}
        <div className={styles.seccionesHeader}>
          <h2 className={styles.titulo}>Secciones del documento</h2>
          <button className={styles.btnAgregarSeccion} onClick={agregarSeccion}>
            + Agregar sección
          </button>
        </div>

        {/* ── Lista de secciones ──
            Si no hay secciones, muestra un mensaje vacío.
            Si hay, renderiza un <Section> por cada una.
            La prop "key" es OBLIGATORIA en listas — ayuda a React a identificar
            qué elemento cambió, se agregó o se eliminó. */}
        <div className={styles.seccionesList}>
          {secciones.length === 0 ? (
            <div className={styles.listaVacia}>
              <div className={styles.listaVaciaIco}>📋</div>
              <p>No hay secciones todavía.</p>
              <p>Haz clic en <strong>"+ Agregar sección"</strong> para comenzar.</p>
            </div>
          ) : (
            secciones.map((sec, index) => (
              <Section
                key={sec.id}             // key único — React lo necesita para optimizar
                section={sec}            // datos de esta sección
                sectionIndex={index}     // posición (para mostrar "SEG-1", "SEG-2", etc.)
                onUpdate={actualizarSeccion}   // callback para cuando el hijo cambia algo
                onDelete={eliminarSeccion}     // callback para cuando el hijo se elimina
              />
            ))
          )}
        </div>

        {/* ── Vista del JSON generado ── */}
        {mostrarJson && jsonGenerado && (
          <div className={styles.jsonWrap}>
            <div className={styles.jsonHeader}>
              <span className={styles.jsonTitulo}>📦 JSON generado</span>
              <span className={styles.jsonHint}>También visible en consola (F12)</span>
              <button
                className={styles.btnCerrarJson}
                onClick={() => setMostrarJson(false)}
              >
                ✕ Cerrar
              </button>
            </div>
            <pre className={styles.jsonCode}>
              {JSON.stringify(jsonGenerado, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default BuilderPanel
