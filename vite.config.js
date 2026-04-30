// ─────────────────────────────────────────────────────────────────────────
// vite.config.js — Configuración de Vite con plugins personalizados
// ─────────────────────────────────────────────────────────────────────────
//
// PLUGINS INCLUIDOS:
//   1. devLogPlugin   → recibe logs del browser y los imprime en la terminal
//   2. uploadImagePlugin → recibe imágenes y las guarda en disco
//
// CORRECCIONES EN uploadImagePlugin:
//   - Verificar que la carpeta del bull_id exista y crearla si no
//   - Log detallado que muestra la ruta completa para diagnóstico
//   - Si hay error de permisos, mensaje descriptivo
//   - Crear también la carpeta padre 'section_images' si no existe
//
// ¿POR QUÉ ESTE PLUGIN Y NO UN ENDPOINT NORMAL DEL BACKEND?
//   En desarrollo (npm run dev), el frontend y el backend son servidores
//   distintos. Las imágenes deben quedar en la carpeta public/ del FRONT
//   para que el browser pueda servirlas con <img src="/assets/...">.
//   Este plugin le dice al servidor Vite (Node.js): "cuando llegue un POST
//   a /__upload, escribe el archivo en public/assets/section_images/{id}/".
//
// ─────────────────────────────────────────────────────────────────────────

import { defineConfig }    from 'vite'
import react               from '@vitejs/plugin-react'
import fs                  from 'fs'
import path                from 'path'
import { fileURLToPath }   from 'url'

// En ES Modules __dirname no existe — lo calculamos manualmente
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// ── Plugin 1: devLog ──────────────────────────────────────────────────
// Recibe POST a /__devlog desde el browser y los imprime en la terminal.
// Útil para ver logs de React en la terminal de npm run dev.
function devLogPlugin() {
  return {
    name: 'dev-log',
    configureServer(server) {
      server.middlewares.use('/__devlog', (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { level, msg, data } = JSON.parse(body)
            const prefix = level === 'error' ? '\x1b[31m[ERROR]\x1b[0m'
              : level === 'warn'  ? '\x1b[33m[WARN]\x1b[0m'
              : '\x1b[36m[LOG]\x1b[0m'
            const extra = data !== undefined
              ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2).slice(0, 600))
              : ''
            console.log(`${prefix} ${msg}`, extra || '')
          } catch { /* body malformado */ }
          res.writeHead(204); res.end()
        })
      })
    }
  }
}

// ── Plugin 2: uploadImage ──────────────────────────────────────────────
// Recibe POST a /__upload con un archivo de imagen y lo guarda en:
//   {proyecto}/public/assets/section_images/{bull_id}/{filename}
//
// FLUJO:
//   1. Browser hace POST /__upload con FormData { image, filename, bull_id }
//   2. Este middleware parsea el multipart/form-data
//   3. Crea la carpeta si no existe: public/assets/section_images/{bull_id}/
//   4. Escribe el archivo en esa carpeta
//   5. Responde con { ok: true, url: "/assets/section_images/{id}/{filename}" }
//
// La URL en la respuesta es relativa al servidor Vite.
// El browser puede acceder a ella como: http://localhost:5173/assets/...
// Y el campo section_content de la BD guarda esa URL relativa.
function uploadImagePlugin() {
  return {
    name: 'upload-image',
    configureServer(server) {
      server.middlewares.use('/__upload', (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return }

        const chunks = []
        req.on('data', chunk => chunks.push(chunk))
        req.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks)

            // Parsear el Content-Type para obtener el boundary del multipart
            // Chrome a veces incluye comillas: boundary="----WebKitFormBoundaryXYZ"
            // Las removemos con replace para que el parse funcione correctamente
            const contentType   = req.headers['content-type'] || ''
            const boundaryMatch = contentType.match(/boundary=(.+)/i)
            if (!boundaryMatch) {
              console.error('[IMG] ❌ Content-Type sin boundary:', contentType)
              throw new Error('Sin boundary en Content-Type')
            }
            const boundary = boundaryMatch[1].replace(/^"|"$/g, '').trim()

            const parsed   = parseMultipart(buffer, boundary)
            const filename = parsed.fields['filename']
            const bullId   = parsed.fields['bull_id'] || '1'
            const fileData = parsed.files['image']

            if (!filename) throw new Error(`Campo 'filename' faltante. Campos: ${Object.keys(parsed.fields).join(',')}`)
            if (!fileData) throw new Error(`Campo 'image' faltante. Archivos: ${Object.keys(parsed.files).join(',')}`)
            if (!fileData.data || fileData.data.length === 0) throw new Error('Archivo de imagen vacío')

            // Ruta completa de la carpeta destino
            // __dirname = directorio de vite.config.js = raíz del proyecto
            // Creamos: public/assets/section_images/{bull_id}/
            const carpetaBase   = path.join(__dirname, 'public', 'assets', 'section_images')
            const carpetaBullId = path.join(carpetaBase, String(bullId))

            console.log('[IMG] 📁 Ruta base section_images:', carpetaBase)
            console.log('[IMG] 📁 Ruta con bull_id:', carpetaBullId)

            // Crear la carpeta base si no existe
            if (!fs.existsSync(carpetaBase)) {
              fs.mkdirSync(carpetaBase, { recursive: true })
              console.log(`\x1b[32m[IMG] ✅ Carpeta base creada: ${carpetaBase}\x1b[0m`)
            }

            // Crear la carpeta del bull_id si no existe
            if (!fs.existsSync(carpetaBullId)) {
              fs.mkdirSync(carpetaBullId, { recursive: true })
              console.log(`\x1b[32m[IMG] ✅ Carpeta bull_id creada: ${carpetaBullId}\x1b[0m`)
            }

            // Escribir el archivo en disco
            const rutaArchivo = path.join(carpetaBullId, filename)
            fs.writeFileSync(rutaArchivo, fileData.data)

            // URL relativa para el browser y la BD
            const url = `/assets/section_images/${bullId}/${filename}`

            console.log(`\x1b[32m[IMG] ✅ Guardada: ${rutaArchivo} (${fileData.data.length} bytes)\x1b[0m`)
            console.log(`\x1b[32m[IMG]    URL pública: ${url}\x1b[0m`)

            // Verificar que el archivo realmente quedó escrito
            if (!fs.existsSync(rutaArchivo)) {
              throw new Error(`El archivo se escribió pero no se puede verificar: ${rutaArchivo}`)
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              ok: true,
              url,
              filename,
              path: rutaArchivo,
              size: fileData.data.length
            }))

          } catch (err) {
            console.error(`\x1b[31m[IMG] ❌ Error al guardar imagen: ${err.message}\x1b[0m`)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: err.message }))
          }
        })
      })
    }
  }
}

// ── parseMultipart ─────────────────────────────────────────────────────
// Parsea manualmente el cuerpo de un request multipart/form-data.
// Es necesario porque Node.js no incluye un parser de multipart nativo.
//
// El formato multipart/form-data funciona así:
//   --boundary\r\n
//   Content-Disposition: form-data; name="fieldname"\r\n
//   \r\n
//   valor del campo\r\n
//   --boundary\r\n
//   Content-Disposition: form-data; name="file"; filename="imagen.jpg"\r\n
//   Content-Type: image/jpeg\r\n
//   \r\n
//   [bytes binarios del archivo]\r\n
//   --boundary--\r\n   ← fin
function parseMultipart(buffer, boundary) {
  const fields = {}
  const files  = {}
  const sep    = Buffer.from('--' + boundary)

  let pos = 0
  while (pos < buffer.length) {
    const bPos = buffer.indexOf(sep, pos)
    if (bPos === -1) break

    pos = bPos + sep.length
    if (buffer[pos] === 0x2D && buffer[pos+1] === 0x2D) break  // '--' = fin
    if (buffer[pos] === 0x0D && buffer[pos+1] === 0x0A) pos += 2  // saltar CRLF

    // Buscar doble CRLF que separa los headers del contenido
    const headerEnd = buffer.indexOf('\r\n\r\n', pos)
    if (headerEnd === -1) break

    const headerStr = buffer.slice(pos, headerEnd).toString('utf8')
    pos = headerEnd + 4

    // Buscar el próximo boundary para delimitar el contenido
    const nextSep = buffer.indexOf(sep, pos)
    const endPos  = nextSep !== -1 ? nextSep - 2 : buffer.length
    const content = buffer.slice(pos, endPos)
    pos = nextSep !== -1 ? nextSep : buffer.length

    // Parsear los headers de esta parte del multipart
    const dispMatch = headerStr.match(/content-disposition[^;]*;[^]*?name="([^"]+)"/i)
    const fileMatch = headerStr.match(/filename="([^"]+)"/i)
    const ctMatch   = headerStr.match(/content-type:\s*([^\r\n]+)/i)

    if (!dispMatch) continue
    const fieldName = dispMatch[1]

    if (fileMatch) {
      // Es un archivo
      files[fieldName] = {
        data:        content,
        filename:    fileMatch[1],
        contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
      }
    } else {
      // Es un campo de texto
      fields[fieldName] = content.toString('utf8')
    }
  }

  return { fields, files }
}

export default defineConfig({
  plugins: [react(), devLogPlugin(), uploadImagePlugin()],
})
