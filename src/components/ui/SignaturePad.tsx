import { useRef, useEffect, useState } from 'react'
import { RotateCcw, Check } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface SignaturePadProps {
  nomeTerapeuta: string
  onConfirm: (dataUrl: string) => void
  onSkip: () => void
  onClose: () => void
}

export function SignaturePad({ nomeTerapeuta, onConfirm, onSkip, onClose }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })

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

  function clear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg" className="space-y-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-ink pr-6">Assinatura digital</h3>
          <p className="text-xs text-ink-4 mt-0.5">{nomeTerapeuta} — Terapeuta Ocupacional</p>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={560}
            height={160}
            className="w-full touch-none cursor-crosshair block"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={() => setDrawing(false)}
            onMouseLeave={() => setDrawing(false)}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={() => setDrawing(false)}
          />
        </div>
        <p className="text-xs text-ink-4 text-center -mt-1">Assine com o mouse ou dedo na área acima</p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={clear} className="!px-4">
            <RotateCcw size={14} /> Limpar
          </Button>
          <Button variant="ghost" onClick={onSkip} className="!px-4">
            Pular assinatura
          </Button>
          <Button
            fullWidth
            onClick={() => onConfirm(canvasRef.current!.toDataURL('image/png'))}
            disabled={!hasDrawn}
          >
            <Check size={14} /> Confirmar e baixar
          </Button>
        </div>
    </Modal>
  )
}
