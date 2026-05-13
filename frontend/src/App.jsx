import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'
import jsPDF from 'jspdf'
import logo from './assets/logo.png'

function App() {

  const [labels, setLabels] = useState([])
  const [loading, setLoading] = useState(false)

  async function renderZPL(zplText) {

    const response = await fetch(
      'https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },
        body: zplText
      }
    )

    if (!response.ok) {
      throw new Error('Erro ao gerar etiqueta')
    }

    const blob = await response.blob()

    return URL.createObjectURL(blob)
  }

  async function processFiles(files) {

    try {

      setLoading(true)

      let extractedFiles = []

      for (const file of files) {

        if (
          file.name.toLowerCase().endsWith('.zip')
        ) {

          const zip =
            await JSZip.loadAsync(file)

          for (const filename of Object.keys(zip.files)) {

            const zipFile =
              zip.files[filename]

            if (zipFile.dir) {
              continue
            }

            if (
              filename.toLowerCase().endsWith('.txt') ||
              filename.toLowerCase().endsWith('.zpl')
            ) {

              const content =
                await zipFile.async('string')

              if (!content.trim()) {
                continue
              }

              extractedFiles.push({
                name: filename,
                content
              })
            }
          }

        } else {

          if (
            file.name.toLowerCase().endsWith('.txt') ||
            file.name.toLowerCase().endsWith('.zpl')
          ) {

            const text = await file.text()

            if (!text.trim()) {
              continue
            }

            extractedFiles.push({
              name: file.name,
              content: text
            })
          }
        }
      }

      extractedFiles =
        extractedFiles.slice(0, 10)

      const renderedLabels = []

      for (const file of extractedFiles) {

        try {

          const image =
            await renderZPL(file.content)

          renderedLabels.push({
  id: crypto.randomUUID(),
  name: file.name,
  image
})

        } catch {

          console.log(
            `Erro ao gerar: ${file.name}`
          )
        }
      }

      setLabels(renderedLabels)

    } catch (error) {

      console.error(error)

      alert('Erro ao processar arquivos')

    } finally {

      setLoading(false)
    }
  }

  function downloadPDF(image, fileName) {

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [152, 101]
    })

    pdf.addImage(
      image,
      'PNG',
      0,
      0,
      101,
      152
    )

    pdf.save(`${fileName}.pdf`)
  }

  const {
    getRootProps,
    getInputProps
  } = useDropzone({

    onDrop: processFiles,

    multiple: true,

    maxFiles: 10,

    accept: {
      'text/plain': ['.txt', '.zpl'],
      'application/zip': ['.zip']
    }
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        padding: '40px',
        display: 'flex',
flexDirection: 'column',
alignItems: 'center',
        fontFamily: 'Arial'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >

        <img
          src={logo}
          alt="Logo"
          style={{
            width: '600px',
            maxWidth: '100%',
            marginBottom: '30px'
          }}
        />

        <h1>Seja bem-vindo(a).</h1>

        <p>
          Escolha seus arquivos e baixe em PDF
          prontos para impressora térmica.
        </p>

        <div
          {...getRootProps()}
          style={{
            border: '2px dashed #007bff',
            padding: '40px',
            borderRadius: '12px',
            backgroundColor: '#fff',
            cursor: 'pointer',
            marginTop: '30px'
          }}
        >

          <input {...getInputProps()} />

          <p>
            Arraste ou clique para subir seus arquivos TXT, ZPL ou ZIP aqui
          </p>

          <p>
            Máximo: 10 etiquetas
          </p>

        </div>

        {loading && (

          <p
            style={{
              marginTop: '20px'
            }}
          >
            Gerando etiquetas...
          </p>

        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginTop: '40px'
          }}
        >

          {labels.map((label, index) => (

            <div
              key={label.id}
  style={{
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow:
      '0 2px 8px rgba(0,0,0,0.1)',

    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
              }}
            >

              <p>{label.name}</p>

              <img
                src={label.image}
                alt="Etiqueta"
                style={{
                  width: '220px',
    border: '1px solid #ddd',
    borderRadius: '8px'
                }}
              />

              <button
                onClick={() =>
                  downloadPDF(
                    label.image,
                    label.name
                  )
                }
                style={{
                  marginTop: '15px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Baixar PDF
              </button>

            </div>

          ))}

        </div>

      </div>
    </div>
  )
}

export default App