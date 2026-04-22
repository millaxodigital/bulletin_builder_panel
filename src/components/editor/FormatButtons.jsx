import styles from './Toolbar.module.css'

const FORMAT_BTNS = [
  { cmd:'bold',       title:'Negrita (Ctrl+B)',  icon:<svg viewBox="0 0 20 20" width="16" height="16"><text x="4" y="15" fontFamily="Georgia,serif" fontSize="14" fontWeight="900" fill="#3a0a0a">B</text></svg> },
  { cmd:'italic',     title:'Cursiva (Ctrl+I)',  icon:<svg viewBox="0 0 20 20" width="16" height="16"><text x="5" y="15" fontFamily="Georgia,serif" fontSize="14" fontWeight="700" fontStyle="italic" fill="currentColor">I</text></svg> },
  { cmd:'underline',  title:'Subrayado (Ctrl+U)', icon:<svg viewBox="0 0 20 20" width="16" height="16"><text x="4" y="13" fontFamily="Arial" fontSize="13" fontWeight="700" fill="currentColor">U</text><line x1="3" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
  { cmd:'hiliteColor', value:'yellow', title:'Resaltar texto', extraClass: styles.btnHighlight,
    icon:<svg viewBox="0 0 20 20" width="16" height="16"><rect x="3" y="11" width="14" height="5" rx="1" fill="#ffe566" opacity="0.9"/><text x="4" y="13" fontFamily="Arial" fontSize="11" fontWeight="700" fill="#7b5800">Aa</text></svg> },
]

export default function FormatButtons({ onFormat, activeFormats = {} }) {
  return (
    <>
      {FORMAT_BTNS.map(({ cmd, value, title, icon, extraClass }) => (
        <button
          key={cmd}
          className={`${styles.toolBtn} ${extraClass || ''} ${activeFormats[cmd] ? styles.active : ''}`}
          title={title}
          onMouseDown={(e) => { e.preventDefault(); onFormat(cmd, value) }}
        >{icon}</button>
      ))}
    </>
  )
}
