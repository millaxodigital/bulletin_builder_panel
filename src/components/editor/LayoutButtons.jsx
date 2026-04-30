import styles from './LayoutButtons.module.css'
const LAYOUTS = [
  { mode:'full',   label:'Completo',     title:'Una sola zona — todo el contenido ocupa toda la anchura',
    svg:<svg viewBox="0 0 54 18" width="54" height="18"><rect x="2" y="2" width="50" height="14" rx="2" fill="currentColor"/></svg> },
  { mode:'half',   label:'Mitades',  title:'Dos columnas iguales',
    svg:<svg viewBox="0 0 54 18" width="54" height="18"><rect x="2" y="2" width="22" height="14" rx="2" fill="currentColor"/><rect x="30" y="2" width="22" height="14" rx="2" fill="currentColor"/></svg> },
  { mode:'thirds', label:'Tercios', title:'Tres columnas iguales',
    svg:<svg viewBox="0 0 54 18" width="54" height="18"><rect x="2" y="2" width="14" height="14" rx="2" fill="currentColor"/><rect x="20" y="2" width="14" height="14" rx="2" fill="currentColor"/><rect x="38" y="2" width="14" height="14" rx="2" fill="currentColor"/></svg> },
]
export default function LayoutButtons({ layout, onLayoutChange }) {
  return (
    <div className={styles.row}>
      <span className={styles.lbl}>📐 Distribución:</span>
      <div className={styles.btns}>
        {LAYOUTS.map(({ mode, label, title, svg }) => (
          <button key={mode} className={`${styles.lbtn} ${layout===mode?styles.active:''}`} title={title} onClick={()=>onLayoutChange(mode)}>
            <span className={styles.icon}>{svg}</span>
            <span className={styles.lbl2}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
