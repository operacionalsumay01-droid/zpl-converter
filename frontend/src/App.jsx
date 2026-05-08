import { useState } from 'react'
import jsPDF from 'jspdf'
import logo from './assets/logo.png'

function App() {
  const [image, setImage] = useState('')
  const [zpl, setZpl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files[0]

    if (!file) return

    const text = await file.text()

    setZpl(text)
  }

  const renderLabel = async () => {
    if (!zpl) {
      alert('Selecione um arquivo TXT ou ZPL')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        'https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: zpl
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao renderizar etiqueta')
      }

      const blob = await response.blob()

      const imageUrl = URL.createObjectURL(blob)

      setImage(imageUrl)
    } catch (error) {
      console.error(error)
      alert('Erro ao gerar etiqueta')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    if (!image) {
      alert('Gere a etiqueta primeiro')
      return
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [152, 101]
    })

    pdf.addImage(image, 'PNG', 0, 0, 101, 152)

    pdf.save('etiqueta.pdf')
  }

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'Arial'
      }}
    >
      <>
  <img
    src={logo}
    alt="Logo"
    style={{
  width: '800px',
  maxWidth: '100%',
  marginBottom: '30px'
}}
  />

  <h1>Seja bem-vindo(a)!</h1>

  <p>
    Escolha seu arquivo a ser convertido e baixe em PDF
    prontos para impressora térmica.
  </p>
</>

      <input
        type="file"
        accept=".txt,.zpl"
        onChange={handleFile}
      />

      <br />
      <br />

      <button onClick={renderLabel}>
        {loading ? 'Gerando...' : 'Gerar Etiqueta'}
      </button>

      <br />
      <br />

      {image && (
        <div>
          <img
            src={image}
            alt="Etiqueta"
            style={{
              width: '300px',
              border: '1px solid #ccc'
            }}
          />

          <br />
          <br />

          <button onClick={downloadPDF}>
            Baixar PDF
          </button>
        </div>
      )}
    </div>
  )
}

export default App