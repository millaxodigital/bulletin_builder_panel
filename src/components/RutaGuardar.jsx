// ─────────────────────────────────────────────────────────────────────────
// RutaGuardar.jsx  — Decide si mostrar el Builder (crear) o Editor (editar)
// ─────────────────────────────────────────────────────────────────────────
//
// ¿CUÁNDO SE USA?
//   Cuando el usuario abre: http://localhost:5173/documento/guardar/2
//
// ¿QUÉ HACE?
//   1. Lee el "2" de la URL (es el bull_id)
//   2. Llama a GET /bulletin/sections/2
//   3a. Si el servidor responde 404 → el boletín no tiene secciones todavía
//       → Muestra BuilderConId (builder vacío para crear contenido nuevo)
//   3b. Si el servidor responde 200 con datos → el boletín ya tiene secciones
//       → Muestra EditorConDatos (editor con las secciones ya cargadas)
//   3c. Si hay otro error → muestra pantalla de error con mensaje descriptivo
//
// ¿POR QUÉ ESTE COMPONENTE Y NO MODIFICAR App.jsx?
//   App.jsx maneja el builder "genérico" sin un bull_id específico.
//   Este componente es para cuando la URL ya trae el ID específico del boletín.
//   Separar responsabilidades hace el código más fácil de mantener.
//
// CORRECCIÓN EN ESTA VERSIÓN:
//   El TOKEN estaba hardcodeado aquí. Ahora se importa de api.js.
//   Cualquier componente que necesite hacer fetch() debe importar
//   { TOKEN, BASE_URL } de services/api.js.
//
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState }    from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import BuilderConId               from './BuilderConId'
import EditorConDatos             from './EditorConDatos'

// Importar TOKEN y BASE_URL del servicio centralizado
// NO hardcodear aquí — si el token expira solo cambias .env
import { TOKEN, BASE_URL } from '../services/api'

export default function RutaGuardar() {
  // useParams(): lee los parámetros dinámicos de la URL
  // Con la ruta "/documento/guardar/:id", si la URL es /documento/guardar/2
  // entonces params.id === "2" (siempre es string, por eso parseamos a int abajo)
  const { id }   = useParams()
  const navigate = useNavigate()

  // Estado de la pantalla
  // 'cargando'  → haciendo la llamada a la API, mostramos spinner
  // 'builder'   → 404, mostrar builder vacío (crear documento)
  // 'editor'    → 200, mostrar editor con datos cargados (editar documento)
  // 'error'     → algo salió mal (network error, 500, ID inválido, etc.)
  const [modo,     setModo]     = useState('cargando')
  const [secciones, setSecciones] = useState([])
  const [errorMsg,  setErrorMsg]  = useState('')

  // Convertir el id de string a número entero
  // parseInt("2", 10) → 2  (el 10 indica base decimal)
  const bullId = parseInt(id, 10)

  // useEffect: se ejecuta una vez cuando el componente se monta
  // El array [bullId] como dependencias significa:
  //   "ejecutar este efecto cuando bullId cambie"
  //   (en la práctica no cambia porque la URL no cambia mientras estás aquí)
  useEffect(function() {
    // Validar que el ID sea un número válido
    if (!bullId || bullId <= 0 || isNaN(bullId)) {
      setErrorMsg('El ID en la URL no es válido. Debe ser un número entero mayor a 0. Ejemplo: /documento/guardar/2')
      setModo('error')
      return
    }

    // Función async interna para poder usar await dentro del useEffect
    // (useEffect no puede ser async directamente)
    async function verificar() {
      console.log('[RutaGuardar] Verificando boletín', bullId)

      try {
        const res = await fetch(BASE_URL + '/bulletin/sections/' + bullId, {
          headers: {
            'Authorization': 'Bearer ' + TOKEN,
            'accept': '*/*',
          },
        })

        if (res.status === 404) {
          // El boletín existe pero no tiene secciones → mostrar builder vacío
          console.log('[RutaGuardar] Boletín ' + bullId + ': 404 → modo crear (builder vacío)')
          setModo('builder')
          return
        }

        if (res.status === 401) {
          throw new Error('Token expirado o inválido. Actualiza VITE_API_TOKEN en el archivo .env')
        }

        if (res.status === 403) {
          throw new Error('No tienes permisos para acceder al boletín ' + bullId)
        }

        if (!res.ok) {
          throw new Error('Error del servidor: ' + res.status + ' ' + res.statusText)
        }

        // 200 OK → hay secciones → mostrar editor con datos
        const data  = await res.json()
        const lista = Array.isArray(data) ? data : (data.data || [])

        if (lista.length === 0) {
          // La API respondió 200 pero sin datos → tratar como builder vacío
          console.log('[RutaGuardar] Boletín ' + bullId + ': 200 pero sin secciones → modo crear')
          setModo('builder')
        } else {
          console.log('[RutaGuardar] Boletín ' + bullId + ': ' + lista.length + ' secciones → modo editar')
          setSecciones(lista)
          setModo('editor')
        }

      } catch (err) {
        // Capturar errores de red (sin conexión) y otros errores inesperados
        console.error('[RutaGuardar] Error al verificar:', err)
        setErrorMsg(
          err.message ||
          'No se pudo conectar con el servidor. Verifica que el backend está corriendo en ' + BASE_URL
        )
        setModo('error')
      }
    }

    verificar()
  }, [bullId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pantalla de carga ─────────────────────────────────────────────
  if (modo === 'cargando') {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#faf8f5', fontFamily:"'Noto Sans',sans-serif", gap:'16px',
      }}>
        <div style={{ fontSize:'48px', animation:'spin 1.2s linear infinite' }}>⏳</div>
        <p style={{ color:'#611232', fontWeight:700, fontSize:'16px', margin:0 }}>
          Verificando boletín #{bullId}...
        </p>
        <p style={{ color:'#aaa', fontSize:'13px', margin:0 }}>
          Consultando si ya tiene contenido guardado
        </p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  // ── Pantalla de error ─────────────────────────────────────────────
  if (modo === 'error') {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#faf8f5', fontFamily:"'Noto Sans',sans-serif",
        gap:'16px', padding:'24px',
      }}>
        <div style={{ fontSize:'48px' }}>❌</div>
        <h2 style={{ color:'#611232', fontFamily:'Georgia,serif', margin:0, textAlign:'center' }}>
          No se pudo cargar el boletín
        </h2>
        <div style={{
          background:'#fdf0f0', border:'1.5px solid #e8a0a0', borderRadius:'10px',
          padding:'16px 20px', maxWidth:'480px', width:'100%',
          color:'#8b2020', fontSize:'14px', lineHeight:1.6,
        }}>
          {errorMsg}
        </div>
        <button
          onClick={function() { navigate('/') }}
          style={{
            background:'#611232', color:'#fff', border:'none',
            borderRadius:'8px', padding:'10px 24px',
            fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          }}
        >
          ← Ir al Builder
        </button>
      </div>
    )
  }

  // ── Modo builder: crear documento nuevo ──────────────────────────
  if (modo === 'builder') {
    return (
      <BuilderConId
        bullId={bullId}
        onVolver={function() { navigate('/') }}
      />
    )
  }

  // ── Modo editor: editar documento existente ──────────────────────
  if (modo === 'editor') {
    return (
      <EditorConDatos
        bullId={bullId}
        seccionesIniciales={secciones}
        onVolver={function() { navigate('/') }}
      />
    )
  }

  return null
}
