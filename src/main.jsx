// main.jsx — Punto de entrada de React
// Este archivo "monta" la app dentro del div#root en index.html
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// StrictMode hace que React detecte problemas potenciales en desarrollo
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
