import { useState, useCallback, useRef, useEffect } from 'react'
import { GripVertical } from 'lucide-react'

interface SandboxLayoutProps {
  sidebar?: React.ReactNode
  editor?: React.ReactNode
  output?: React.ReactNode
  sidebarWidth?: number
  outputWidth?: number
  onSidebarResize?: (width: number) => void
  onOutputResize?: (width: number) => void
}

export default function SandboxLayout({
  sidebar, editor, output,
  sidebarWidth: controlledSidebarWidth, outputWidth: controlledOutputWidth,
  onSidebarResize, onOutputResize,
}: SandboxLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(controlledSidebarWidth ?? 220)
  const [outputWidth, setOutputWidth] = useState(controlledOutputWidth ?? 320)
  const [dragging, setDragging] = useState<'sidebar' | 'output' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((panel: 'sidebar' | 'output') => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(panel)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (dragging === 'sidebar') {
        const newWidth = Math.max(160, Math.min(400, e.clientX - rect.left))
        setSidebarWidth(newWidth); onSidebarResize?.(newWidth)
      } else if (dragging === 'output') {
        const newWidth = Math.max(240, Math.min(600, rect.right - e.clientX))
        setOutputWidth(newWidth); onOutputResize?.(newWidth)
      }
    }
    const handleMouseUp = () => setDragging(null)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging, onSidebarResize, onOutputResize])

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {sidebar && (
        <>
          <div className="shrink-0 border-r border-border/30 bg-surface/50 relative z-10" style={{ width: sidebarWidth }}>
            {sidebar}
          </div>
          <div
            className={`w-1.5 shrink-0 cursor-col-resize flex items-center justify-center group transition-colors duration-200 ${dragging === 'sidebar' ? 'bg-primary/20' : 'hover:bg-primary/10'}`}
            onMouseDown={handleMouseDown('sidebar')}
          >
            <GripVertical className="w-3 h-3 text-text-muted/30 group-hover:text-primary/50 transition-colors duration-200" />
          </div>
        </>
      )}

      <div className="flex-1 min-w-0 overflow-hidden">{editor}</div>

      {output && (
        <>
          <div
            className={`w-1.5 shrink-0 cursor-col-resize flex items-center justify-center group transition-colors duration-200 ${dragging === 'output' ? 'bg-primary/20' : 'hover:bg-primary/10'}`}
            onMouseDown={handleMouseDown('output')}
          >
            <GripVertical className="w-3 h-3 text-text-muted/30 group-hover:text-primary/50 transition-colors duration-200" />
          </div>
          <div className="shrink-0 border-l border-border/30 overflow-hidden bg-surface/50" style={{ width: outputWidth }}>
            {output}
          </div>
        </>
      )}
    </div>
  )
}
