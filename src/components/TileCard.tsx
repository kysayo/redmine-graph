import { useCallback, useRef, useState } from 'react'
import { toPng } from 'html-to-image'

const btnBase: React.CSSProperties = {
  fontSize: 12,
  padding: '3px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  cursor: 'pointer',
  background: '#fff',
  color: '#374151',
  fontFamily: 'sans-serif',
  transition: 'background 0.15s, border-color 0.15s',
}

interface TileCardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  fileName?: string
  onCopyTile?: () => void
}

export function TileCard({ children, style, fileName = 'redmine-graph', onCopyTile }: TileCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'ok' | 'err'>('idle')

  const pngFilter = (node: HTMLElement) => !node.classList?.contains('png-tile-buttons')

  const handleCopy = useCallback(async () => {
    if (!ref.current) return
    if (typeof ClipboardItem === 'undefined') {
      setCopyStatus('err')
      setTimeout(() => setCopyStatus('idle'), 2000)
      return
    }
    setCopyStatus('copying')
    try {
      const dataUrl = await toPng(ref.current, { backgroundColor: '#ffffff', skipFonts: true, filter: pngFilter })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopyStatus('ok')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('err')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!ref.current) return
    const dataUrl = await toPng(ref.current, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, filter: pngFilter })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [fileName])

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        ...style,
      }}
    >
      <div
        className="png-tile-buttons"
        style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 4, zIndex: 1 }}
      >
        {onCopyTile && (
          <button type="button" onClick={onCopyTile} style={btnBase}>
            Copy graph
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          style={{
            ...btnBase,
            cursor: copyStatus === 'copying' ? 'default' : 'pointer',
            color: copyStatus === 'ok' ? '#059669' : copyStatus === 'err' ? '#dc2626' : '#374151',
            borderColor: copyStatus === 'ok' ? '#6ee7b7' : copyStatus === 'err' ? '#fca5a5' : '#d1d5db',
          }}
        >
          {copyStatus === 'ok' ? 'Copied!' : copyStatus === 'err' ? 'Failed' : copyStatus === 'copying' ? '...' : 'PNG Copy'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          style={btnBase}
        >
          PNG DL
        </button>
      </div>
      {children}
    </div>
  )
}
