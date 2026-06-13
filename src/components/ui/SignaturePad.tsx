import { useRef, useEffect, useState } from 'react'
import { X, RotateCcw, Check, PenLine, Type } from 'lucide-react'

interface SignaturePadProps {
  nomeTerapeuta: string
  onConfirm: (dataUrl: string) => void
  onSkip: () => void
  onClose: () => void
}

const FONTES = [
  { label: 'Clássica',  font: '52px "Dancing Script", cursive' },
  { label: 'Elegante',  font: 'italic 48px "Georgia", serif' },
  { label: 'Moderna',   font: '44px "Pacifico", cursive' },
  { label: 'Formal',    font: 'italic bold 40px "Times New Roman", serif' },
]

export function SignaturePad({ nomeTerapeuta, onConfirm, onSkip, onClose }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modo, setModo] = useState<'desenhar' | 'fonte'>('desenhar')
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [fonteIdx, setFonteIdx] = useState(0)
  const lastPos = useRef({ x: 0, y: 0 })

  function limparCanvas() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    if (modo === 'fonte') renderFonte(fonteIdx)
    else { limparCanvas(); setHasDrawn(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, fonteIdx])

  function renderFonte(idx: number) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1a1a1a'
    ctx.font = FONTES[idx].font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(nomeTerapeuta, canvas.width / 2, canvas.height / 2)
    setHasDrawn(true)
  }

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * (canvas.width / rect.width),
      y: ((e as React.MouseEvent).clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDrawing(true)
    setHasDrawn(true)
    lastPos.current = getPos(e)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">Assinatura digital</h3>
            <p className="text-xs text-gray-500 mt-0.5">{nomeTerapeuta} — Terapeuta Ocupacional</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setModo('desenhar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${modo === 'desenhar' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
          >
            <PenLine size={14} /> Desenhar
          </button>
          <button
            onClick={() => setModo('fonte')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${modo === 'fonte' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
          >
            <Type size={14} /> Fonte automática
          </button>
        </div>

        {/* Canvas */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={560}
            height={160}
            className={`w-full block ${modo === 'desenhar' ? 'touch-none cursor-crosshair' : 'cursor-default'}`}
            onMouseDown={modo === 'desenhar' ? startDraw : undefined}
            onMouseMove={modo === 'desenhar' ? draw : undefined}
            onMouseUp={modo === 'desenhar' ? () => setDrawing(false) : undefined}
            onMouseLeave={modo === 'desenhar' ? () => setDrawing(false) : undefined}
            onTouchStart={modo === 'desenhar' ? startDraw : undefined}
            onTouchMove={modo === 'desenhar' ? draw : undefined}
            onTouchEnd={modo === 'desenhar' ? () => setDrawing(false) : undefined}
          />
        </div>

        {/* Seletor de fonte */}
        {modo === 'fonte' && (
          <div className="flex gap-2">
            {FONTES.map((f, i) => (
              <button
                key={f.label}
                onClick={() => setFonteIdx(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${fonteIdx === i ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {modo === 'desenhar' && (
          <p className="text-xs text-gray-400 text-center -mt-1">Assine com o mouse ou dedo na área acima</p>
        )}

        {/* Botões */}
        <div className="flex gap-3">
          {modo === 'desenhar' && (
            <button
              onClick={() => { limparCanvas(); setHasDrawn(false) }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw size={14} /> Limpar
            </button>
          )}
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-500 hover:bg-gray-50"
          >
            Pular
          </button>
          <button
            onClick={() => onConfirm(canvasRef.current!.toDataURL('image/png'))}
            disabled={!hasDrawn}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-semibold hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} /> Confirmar e baixar
          </button>
        </div>

      </div>
    </div>
  )
}
