import styles from './Toolbar.module.css'

const CASE_BTNS = [
  { cmd:'upper',    label:'AA', title:'TODO EN MAYÚSCULAS'             },
  { cmd:'lower',    label:'aa', title:'todo en minúsculas'             },
  { cmd:'title',    label:'Aa', title:'Formato Título (primera letra)' },
  { cmd:'sentence', label:'A·', title:'Oración (primera letra)'        },
]

export default function CaseButtons({ onCase }) {
  return (
    <>
      {CASE_BTNS.map(({ cmd, label, title }) => (
        <button key={cmd} className={`${styles.toolBtn} ${styles.caseBtn}`} title={title}
          onMouseDown={(e) => { e.preventDefault(); onCase(cmd) }}>
          {label}
        </button>
      ))}
    </>
  )
}
