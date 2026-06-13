import ColorThief from 'color-thief-browser'

export interface BrandColors {
  primary: string
  secondary: string
  textOnPrimary: string
  light: string
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function lightenColor(hex: string, amount = 0.92): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return rgbToHex(
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  )
}

function getTextOnColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1a1a1a' : '#ffffff'
}

export const defaultBrandColors: BrandColors = {
  primary: '#2d7a3a',
  secondary: '#5aaf65',
  textOnPrimary: '#ffffff',
  light: '#eaf3de',
}

export async function extrairCores(imgEl: HTMLImageElement): Promise<BrandColors> {
  try {
    if (!imgEl.complete) await new Promise(r => imgEl.addEventListener('load', r))
    const ct = new ColorThief()
    const dominant = ct.getColor(imgEl) as [number, number, number]
    const palette = ct.getPalette(imgEl, 3) as [number, number, number][]
    const primary = rgbToHex(...dominant)
    const secondary = palette[1] ? rgbToHex(...palette[1]) : primary
    return { primary, secondary, textOnPrimary: getTextOnColor(primary), light: lightenColor(primary, 0.92) }
  } catch {
    return defaultBrandColors
  }
}
