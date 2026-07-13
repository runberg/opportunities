"use client"

import { useState, useCallback, useRef } from "react"

export function useDropZone(onFile: (f: File) => void) {
  const [dragging, setDragging] = useState(false)
  const onFileRef = useRef(onFile)
  onFileRef.current = onFile

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFileRef.current(f)
  }, [])

  return { dragging, onDragOver, onDragLeave, onDrop }
}
