"use client"

import { useRef } from "react"
import { FileUp } from "lucide-react"
import { cn, formatBytes, getDropZoneCls } from "@/shared/lib/utils"

interface FileDropZoneProps {
  readonly file: File | null
  readonly dragging: boolean
  readonly onDragOver: (e: React.DragEvent) => void
  readonly onDragLeave: (e: React.DragEvent) => void
  readonly onDrop: (e: React.DragEvent) => void
  readonly onFile: (f: File) => void
  readonly accept?: string
  readonly className?: string
  readonly compact?: boolean
}

export function FileDropZone({
  file,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFile,
  accept,
  className,
  compact = false,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const borderCls = getDropZoneCls(dragging, !!file)

  if (compact) {
    const idleIconCls = file ? "text-green-500" : "text-gray-500"
    const upIconCls = dragging ? "text-[#006fff]" : idleIconCls
    return (
      <button
        type="button"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm",
          borderCls,
          className
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
        <FileUp size={15} className={upIconCls} />
        {file
          ? <span className="font-medium text-green-400 truncate">{file.name}</span>
          : <span className="text-gray-400"><span className="font-medium text-gray-300">Drop file</span> or click to browse</span>
        }
      </button>
    )
  }

  return (
    <button
      type="button"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[100px]",
        borderCls,
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      {file ? (
        <>
          <FileUp size={18} className="text-green-500" />
          <p className="text-sm font-medium text-green-400 text-center px-3">{file.name}</p>
          <p className="text-xs text-gray-400">{formatBytes(file.size)} · click to change</p>
        </>
      ) : (
        <>
          <FileUp size={18} className={dragging ? "text-[#006fff]" : "text-gray-500"} />
          <p className="text-sm text-gray-400 text-center">
            <span className="font-medium text-gray-300">Drop file here</span> or click to browse
          </p>
        </>
      )}
    </button>
  )
}
