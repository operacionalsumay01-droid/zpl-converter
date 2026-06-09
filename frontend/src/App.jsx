import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'
import jsPDF from 'jspdf'
import logo from './assets/logo.png'
import { XMLParser } from 'fast-xml-parser'

function App() {

  const [labels, setLabels] = useState([])
  const [loading, setLoading] = useState(false)
  const [tipoEtiqueta, setTipoEtiqueta] =
  useState('xml')
  const [dadosXML, setDadosXML] =
  useState(null)
  const [volumesPreview, setVolumesPreview] =
  useState([])
  const [transportadoraEditada,
  setTransportadoraEditada] =
  useState('')
  const [volumesEditados,
  setVolumesEditados] =
  useState('')

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

  function extrairDadosXML(xmlText) {

  const parser = new XMLParser()

  const dados = parser.parse(xmlText)

  const infNFe =
    dados.nfeProc.NFe.infNFe

  return {

  emitente:
    infNFe.emit?.xNome || '',

  destinatario:
    infNFe.dest?.xNome || '',

  pedido:
    Array.isArray(infNFe.det)
      ? infNFe.det[0]?.prod?.xPed || ''
      : infNFe.det?.prod?.xPed || '',

  bairro:
    infNFe.dest?.enderDest?.xBairro || '',

  cidade:
    infNFe.dest?.enderDest?.xMun || '',

  uf:
    infNFe.dest?.enderDest?.UF || '',

  transportadora:
    infNFe.transp?.transporta?.xNome || '',

  volumes:
    infNFe.transp?.vol?.qVol || 1,

  nota:
    infNFe.ide?.nNF || ''
} 
}

  async function processFiles(files) {

    try {

      setLoading(true)

      if (tipoEtiqueta === 'xml') {

  let texto = ''

const arquivo = files[0]

if (
  arquivo.name
    .toLowerCase()
    .endsWith('.zip')
) {

  const zip =
    await JSZip.loadAsync(
      arquivo
    )

  const xmlFile =
    Object.values(zip.files)
      .find(
        file =>
          file.name
            .toLowerCase()
            .endsWith('.xml')
      )

  if (!xmlFile) {

    alert(
      'Nenhum XML encontrado no ZIP'
    )

    return
  }

  texto =
    await xmlFile.async(
      'string'
    )

} else {

  texto =
    await arquivo.text()
}

const dados =
  extrairDadosXML(texto)

  setDadosXML(dados)

  setTransportadoraEditada(
  dados.transportadora
)

setVolumesEditados(
  dados.volumes
)

  const totalVolumes =
  Number(dados.volumes || 1)

const listaVolumes = []

for (
  let i = 1;
  i <= totalVolumes;
  i++
) {

  listaVolumes.push({
    ...dados,
    volumeAtual: i
  })
}

setVolumesPreview(listaVolumes)

  setLoading(false)

  return
}

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

  function limitarTexto(texto, limite) {

  if (!texto) return ''

  if (texto.length <= limite) {
    return texto
  }

  return texto
    .substring(0, limite)
    .split(' ')
    .slice(0, -1)
    .join(' ')
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

function limitarTexto(texto, limite) {

  if (!texto) return ''

  if (texto.length <= limite) {
    return texto
  }

  return texto
    .substring(0, limite)
    .split(' ')
    .slice(0, -1)
    .join(' ')
}

function atualizarEtiqueta() {

  const novosVolumes = []

  for (
    let i = 1;
    i <= Number(volumesEditados);
    i++
  ) {

    novosVolumes.push({

      ...dadosXML,

      transportadora:
        transportadoraEditada,

      volumes:
        Number(volumesEditados),

      volumeAtual: i
    })
  }

  setVolumesPreview(
    novosVolumes
  )
}

function downloadXMLPDF() {

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [50, 100]
  })

  volumesPreview.forEach((volume, index) => {

    const destinatario =
      limitarTexto(
        volume.destinatario,
        46
      )

    const transportadora =
      limitarTexto(
        volume.transportadora,
        26
      )

    const emitente =
      limitarTexto(
        volume.emitente,
        35
      )

    if (index > 0) {
      pdf.addPage([100, 50], 'landscape')
    }

    pdf.setFont('helvetica', 'bold')

    // Cabeçalho
    pdf.setFontSize(12)

    pdf.text(
      emitente,
      50,
      5,
      {
        align: 'center'
      }
    )

    // Destinatário
    pdf.setFontSize(10)
    pdf.text('DESTINATÁRIO:', 3, 12)

    pdf.setFont('helvetica', 'normal')
    pdf.text(
      destinatario,
  3,
  16
)

    // Bairro
    pdf.setFont('helvetica', 'bold')

pdf.text(
  'BAIRRO:',
  3,
  21
)

pdf.setFont('helvetica', 'normal')

pdf.text(
  volume.bairro || '',
  19,
  21
)

    // Cidade
    pdf.setFont('helvetica', 'bold')

pdf.text(
  'CIDADE:',
  3,
  25
)

pdf.setFont('helvetica', 'normal')

pdf.text(
  `${volume.cidade || ''} - ${volume.uf || ''}`,
  19,
  25
)

    // Transportadora
    pdf.setFont('helvetica', 'bold')

pdf.text(
  'TRANSPORTADORA:',
  3,
  30
)

pdf.setFont('helvetica', 'normal')

pdf.text(
  transportadora,
  40,
  30
)

    pdf.line(
  2,
  32,
  98,
  32
)
  pdf.line(
  2,
  45,
  98,
  45
)
    pdf.line(
  67,
  32,
  67,
  45
)

    // Pedido
    pdf.setFont('helvetica', 'bold')
pdf.setFontSize(9)

pdf.text(
  `PEDIDO: ${volume.pedido || ''}`,
  3,
  40
)

    // Nota
pdf.setFontSize(14)

pdf.text(
  `NF: ${volume.nota || ''}`,
  38,
  40
)

    // Volume
    pdf.setFontSize(12)

pdf.text(
  'VOL:',
  73,
  37,
  {
    align: 'center'
  }
)

    pdf.setFontSize(17)

    pdf.text(
      `${String(volume.volumeAtual).padStart(2, '0')}/${String(volume.volumes).padStart(2, '0')}`,
      83,
      44,
      {
        align: 'center'
      }
    )

    pdf.setFontSize(8)

pdf.setFont(
  'helvetica',
  'bold'
)

pdf.text(
  'FAVOR CONFERIR A MERCADORIA NO ATO DA ENTREGA',
  50,
  49,
  {
    align: 'center'
  }
)

  })

  pdf.save('etiquetas-volumes.pdf')
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
  'text/xml': ['.xml'],
  'application/xml': ['.xml'],
  'application/zip': ['.zip']
}
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        padding: '5px',
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
          paddingTop: '0px',
          textAlign: 'center'
        }}
      >

        <img
          src={logo}
          alt="Logo"
          style={{
            width: '500px',
            maxWidth: '100%',
            marginTop: '0px',
            marginBottom: '5px'
          }}
        />

        <h1
          style={{
            marginTop: '0px',
            marginBottom: '5px',
            fontSize: '24px'
          }}
>
  Seja bem-vindo(a).
</h1>

        <p
        style={{
           marginTop: '0px',
           marginBottom: '10px'
          }}
>
      Escolha seus arquivos e baixe em PDF
      prontos para impressora térmica.
        </p>
        <div
  style={{
    marginBottom: '30px'
  }}
>

  <h3
  style={{
    marginTop: '5px',
    marginBottom: '5px'
  }}
>
  Tipo de Etiqueta
</h3>

  <select
    value={tipoEtiqueta}
  onChange={(e) => {

    const novoTipo =
      e.target.value

    setTipoEtiqueta(
      novoTipo
    )

    setLabels([])

    setDadosXML(null)

    setVolumesPreview([])

    setTransportadoraEditada('')

    setVolumesEditados('')
  }}
    style={{
      padding: '5px',
      fontSize: '16px'
    }}
  >

    <option value="xml">
      Etiqueta de volumes de Nota Fiscal
    </option>

    <option value="zpl">
      Etiqueta Shopee (ZPL/TXT)
    </option>

  </select>

</div>

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
            Arraste ou clique para subir seus arquivos TXT, ZPL, XML ou ZIP aqui
          </p>

          <p>
            Máximo: 10 arquivos
          </p>

        </div>

        {
  dadosXML && (

    <div
      style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        marginTop: '30px',
        marginBottom: '30px'
      }}
    >

      <h3
  style={{
    fontSize: '32px',
    marginBottom: '30px'
  }}
>
  Conferência da Etiqueta
</h3>

      <div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '20px',
    fontSize: '22px'
  }}


  
>

  <b>Transportadora:</b>

  <input
    type="text"
    value={transportadoraEditada}
    onChange={(e) =>
      setTransportadoraEditada(
        e.target.value
      )
    }
    style={{
      width: '400px',
      fontSize: '18px',
      padding: '8px'
    }}
  />

</div>

      <div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '25px',
    fontSize: '22px'
  }}
>

  <b>Quantidade de Volumes:</b>

  <input
    type="number"
    value={volumesEditados}
    onChange={(e) =>
      setVolumesEditados(
        e.target.value
      )
    }
    style={{
      width: '120px',
      fontSize: '18px',
      padding: '8px'
    }}
  />

</div>

    <button
    onClick={atualizarEtiqueta}
    style={{
      backgroundColor: '#007bff',
      color: '#fff',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '18px',
      fontWeight: 'bold'
    }}
  >
    Atualizar Etiqueta
  </button>
    </div>
)
}

{
  volumesPreview.length > 0 && (

    <div
      style={{
        marginTop: '20px',
        textAlign: 'center'
      }}
    >

      <button
        onClick={downloadXMLPDF}
        style={{
          backgroundColor: '#28a745',
          color: '#fff',
          border: 'none',
          padding: '12px 25px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        Baixar PDF das Etiquetas
      </button>

    </div>
  )
}

        {
  volumesPreview.length > 0 && (

    <>
      {volumesPreview.map((volume) => (

    <div
  key={volume.volumeAtual}
  style={{
    width: '600px',
    minHeight: '260px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    color: '#000',
    fontSize: '14px',
    textAlign: 'left',
    marginTop: '60px',
    marginBottom: '30px'
  }}
>
        <div
          style={{
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '20px',
            borderBottom: '1px solid #000',
            paddingBottom: '5px'
          }}
          >
            {volume.emitente}
        </div>

        <div
        style={{
          marginTop: '8px',
          fontSize: '17px'
          }}
>
        <b>DESTINATÁRIO:</b><br />
{volume.destinatario}
        </div>

        <div
        style={{
          marginTop: '8px',
          fontSize: '16px'
          }}
>
        <b>BAIRRO:</b> {volume.bairro}
        </div>

        <div
        style={{
          fontSize: '16px'
        }}
>
        <b>CIDADE:</b> {volume.cidade} - {volume.uf}
        </div>

        <div
        style={{
          marginTop: '8px',
          fontSize: '16px'
          }}
>
          <b>TRANSPORTADORA:</b><br />
          {volume.transportadora}
          </div>

        <div
          style={{
            display: 'flex',
            marginTop: '10px',
            borderTop: '1px solid #000',
            borderBottom: '1px solid #000'
          }}
        >

          <div
            style={{
              flex: 1,
              padding: '10px'
            }}
          >
            <div
  style={{
    fontWeight: 'bold',
    fontSize: '20px',
    display: 'flex',
    gap: '70px'
  }}
>
  <span>
    PEDIDO: {dadosXML.pedido}
  </span>

  <span>
    NOTA FISCAL: {dadosXML.nota}
  </span>
</div>
          </div>

          <div
            style={{
              width: '220px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '1px solid #000'
            }}
          >
            <div
              style={{
                fontSize: '34px',
                fontWeight: 'bold',
                lineHeight: '1'
              }}
            >
              VOL. {String(volume.volumeAtual).padStart(2, '0')}/{String(volume.volumes).padStart(2, '0')}
            </div>
          </div>

        </div>

        <div
          style={{
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '20px',
            marginTop: '8px'
          }}
        >
          FAVOR CONFERIR A MERCADORIA
          NO ATO DA ENTREGA
        </div>

      </div>

  ))}

</>

)
}



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
                  width: '280px',
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