// ─────────────────────────────────────────────────────────────────────────
// FloatingToolbar.jsx — Barra de herramientas flotante
// ─────────────────────────────────────────────────────────────────────────
//
// CAMBIOS RESPECTO AL ORIGINAL:
//
//   1. Botón "Ver Doc" SIEMPRE visible cuando onVerDocumento se pasa.
//      ANTES: el botón se mostraba siempre, pero EditorBoletín pasaba null.
//      AHORA: el botón siempre aparece si la función se pasa como prop.
//      El problema real estaba en EditorBoletín.jsx que pasaba null.
//      Esta versión lo muestra incondicionalmente (sin el &&).
//
//   2. Botón "Preview/Builder" SOLO en móvil (≤ 768px).
//      El botón existe en el DOM siempre, pero el CSS lo oculta en desktop.
//      .fabTogglePanel { display: none } → oculto en desktop
//      @media (max-width: 768px) { display: flex } → visible en móvil
//      En desktop los dos paneles siempre están visibles lado a lado.
//      En móvil solo hay espacio para uno, entonces se alterna con este botón.
//
// PROPS:
//   onAgregarSeccion    → función: agrega sección al documento
//   onGuardar           → función: guarda en la API
//   onDescargar         → función: descarga el JSON
//   onVerDocumento      → función: va al visor del documento
//                         Si es null, el botón "Ver Doc" NO se muestra.
//   onEditarDocumento   → función | null: va al editor de boletines
//   cargando            → boolean: true mientras guarda (spinner + disabled)
//   totalSecciones      → number: contador visible en el botón de colapso
//   panelMovil          → 'builder' | 'preview': panel visible en móvil
//   onTogglePanelMovil  → función: alterna entre paneles (solo se usa en móvil)
//
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import styles from './FloatingToolbar.module.css'

export default function FloatingToolbar({
  onAgregarSeccion,
  onGuardar,
  onDescargar,
  onVerDocumento,
  onEditarDocumento,
  cargando,
  totalSecciones,
  panelMovil,
  onTogglePanelMovil,
}) {
  // colapsado: true = el menú se minimiza para no ocupar espacio
  const [colapsado, setColapsado] = useState(false)

  return (
    <div className={`${styles.fab} ${colapsado ? styles.fabColapsado : ''}`}>

      {/* ── Botón de colapsar/expandir ────────────────────────────────
          SIEMPRE visible. Muestra el contador de secciones cuando está
          colapsado para que el usuario sepa que hay contenido creado.  */}
      <button
        className={`${styles.fabBtn} ${styles.fabToggle}`}
        onClick={() => setColapsado(p => !p)}
        title={colapsado ? 'Expandir menú' : 'Contraer menú'}
      >
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
          {colapsado
            ? <path d="M4 8l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            : <path d="M4 12l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          }
        </svg>
        {totalSecciones > 0 && (
          <span className={styles.counterInline}>{totalSecciones}</span>
        )}
      </button>

      {/* ── Botón "Preview/Builder" — SOLO EN MÓVIL ────────────────────
          Existe en el DOM siempre, pero el CSS lo oculta en desktop.
          FloatingToolbar.module.css tiene:
            .fabTogglePanel { display: none }         ← oculto en desktop
            @media(max-width:768px) { display: flex } ← visible en móvil
          En desktop los dos paneles se ven simultáneamente → no se necesita.
          En móvil solo cabe uno a la vez → este botón permite cambiar.    */}
      {onTogglePanelMovil && (
        <button
          className={`${styles.fabBtn} ${styles.fabTogglePanel}`}
          onClick={onTogglePanelMovil}
          title={panelMovil === 'builder' ? 'Ver Preview' : 'Ver Builder'}
        >
          {panelMovil === 'builder' ? (
            /* Ícono ojo = "quiero ver el preview del documento" */
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
          ) : (
            /* Ícono lápiz = "quiero volver al builder" */
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          <span className={styles.fabLabel}>
            {panelMovil === 'builder' ? 'Preview' : 'Builder'}
          </span>
        </button>
      )}

      {/* ── Botones que se ocultan cuando el menú está colapsado ──── */}
      {!colapsado && (
        <>
          <div className={styles.sep}/>

          {/* Agregar sección — ícono de cuadro con + */}
          <button
            className={styles.fabBtn}
            onClick={onAgregarSeccion}
            title="Agregar nueva sección al documento"
          >
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className={styles.fabLabel}>Sección</span>
          </button>

          <div className={styles.sep}/>

          {/* Guardar — spinner mientras carga */}
          <button
            className={`${styles.fabBtn} ${cargando ? styles.fabCargando : ''}`}
            onClick={onGuardar}
            disabled={cargando}
            title="Guardar el documento en la base de datos"
          >
            {cargando
              ? <svg viewBox="0 0 24 24" fill="none" width="20" height="20" className={styles.spin}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" strokeLinecap="round"/>
                </svg>
              : <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            }
            <span className={styles.fabLabel}>{cargando ? '...' : 'Guardar'}</span>
          </button>

          <div className={styles.sep}/>

          {/* Ver Documento — ícono de hoja de papel
              Se muestra si y solo si se pasa la función onVerDocumento.
              En App.jsx SIEMPRE se pasa.
              En EditorBoletín.jsx TAMBIÉN se pasa (antes no se pasaba → bug). */}
          {onVerDocumento && (
            <button
              className={styles.fabBtn}
              onClick={onVerDocumento}
              title="Ver el documento publicado como lo ve el ciudadano"
            >
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                {/* Hoja con esquina doblada */}
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Líneas simulando texto */}
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span className={styles.fabLabel}>Ver Doc</span>
            </button>
          )}

          {onVerDocumento && <div className={styles.sep}/>}

          {/* Editar boletín existente */}
          {onEditarDocumento && (
            <button
              className={styles.fabBtn}
              onClick={onEditarDocumento}
              title="Cargar un boletín guardado anteriormente para editarlo"
            >
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className={styles.fabLabel}>Editar</span>
            </button>
          )}

          <div className={styles.sep}/>

          {/* Descargar JSON */}
          <button
            className={styles.fabBtn}
            onClick={onDescargar}
            title="Descargar el JSON generado (para debug o respaldo)"
          >
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className={styles.fabLabel}>JSON</span>
          </button>
        </>
      )}
    </div>
  )
}
