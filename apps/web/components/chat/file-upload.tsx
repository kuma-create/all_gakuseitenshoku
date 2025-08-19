"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Paperclip, X, ImageIcon, FileText, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onFileSelect: (file: File) => Promise<void>
  accept?: string
  maxSize?: number // in MB
  className?: string
  disabled?: boolean
}

export function FileUpload({
  onFileSelect,
  accept = "image/*,application/pdf",
  maxSize = 5, // 5MB default
  className,
  disabled = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`ファイルサイズは${maxSize}MB以下にしてください`)
      return false
    }

    // Check file type
    const acceptedTypes = accept.split(",")
    const fileType = file.type

    // For images and PDFs, check MIME type
    if (
      fileType &&
      acceptedTypes.some((type) => {
        if (type.includes("*")) {
          return fileType.startsWith(type.replace("*", ""))
        }
        return type === fileType
      })
    ) {
      return true
    }

    setError("サポートされていないファイル形式です")
    return false
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      handleFile(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    setError(null)

    if (validateFile(file)) {
      setSelectedFile(file)

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreview(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 10
          if (newProgress >= 100) {
            clearInterval(interval)
            return 100
          }
          return newProgress
        })
      }, 200)

      // Call the actual upload function
      await onFileSelect(selectedFile)

      // Clear the selection after successful upload
      setTimeout(() => {
        clearInterval(interval)
        setSelectedFile(null)
        setPreview(null)
        setUploadProgress(0)
        setUploading(false)
      }, 500)
    } catch (error) {
      console.error("Upload failed:", error)
      setError("アップロードに失敗しました")
      setUploading(false)
    }
  }

  const cancelUpload = () => {
    setSelectedFile(null)
    setPreview(null)
    setUploadProgress(0)
    setUploading(false)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = () => {
    if (!selectedFile) return <Paperclip className="h-5 w-5" />

    if (selectedFile.type.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5" />
    }

    return <FileText className="h-5 w-5" />
  }

  return (
    <div className={cn("relative", className)}>
      {!selectedFile ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors",
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
            disabled && "cursor-not-allowed opacity-60",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center space-y-2 text-center">
            <Paperclip className="h-8 w-8 text-gray-400" />
            <div className="text-sm font-medium">
              <label
                htmlFor="file-upload"
                className={cn("cursor-pointer text-blue-600", disabled && "cursor-not-allowed")}
              >
                ファイルを選択
              </label>
              <span className="text-gray-500"> または ドラッグ&ドロップ</span>
            </div>
            <p className="text-xs text-gray-500">
              {accept.includes("image") ? "画像" : ""}
              {accept.includes("image") && accept.includes("pdf") ? "・" : ""}
              {accept.includes("pdf") ? "PDF" : ""}
              （最大{maxSize}MB）
            </p>
            <input
              ref={fileInputRef}
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept={accept}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon()}
              <div className="max-w-[200px]">
                <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={cancelUpload} disabled={uploading} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {preview && (
            <div className="mt-2 max-h-40 overflow-hidden rounded-md">
              <img src={preview || "/placeholder.svg"} alt="Preview" className="h-auto w-full object-cover" />
            </div>
          )}

          {uploading ? (
            <div className="mt-4 space-y-2">
              <Progress value={uploadProgress} className="h-2 w-full" />
              <p className="text-right text-xs text-gray-500">{uploadProgress}%</p>
            </div>
          ) : (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleUpload} size="sm" className="gap-1">
                <Upload className="h-4 w-4" />
                アップロード
              </Button>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
