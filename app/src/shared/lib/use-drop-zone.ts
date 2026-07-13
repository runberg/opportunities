"use client"

import { useState, useCallback, useEffect, useRef } from "react"

export function useWindowDragExpand(onEnter: () => void) {
  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter
  useEffect(() => {
    function handleEnter(e: DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) onEnterRef.current()
    }
    function handleOver(e: DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault()
    }
    function handleDrop(e: DragEvent) { e.preventDefault() }
    window.addEventListener("dragenter", handleEnter)
    window.addEventListener("dragover", handleOver)
    window.addEventListener("drop", handleDrop)
    return () => {
      window.removeEventListener("dragenter", handleEnter)
      window.removeEventListener("dragover", handleOver)
      window.removeEventListener("drop", handleDrop)
    }
  }, [])
}

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
