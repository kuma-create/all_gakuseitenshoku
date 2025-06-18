/* ------------------------------------------------------------------
   components/media/upload.tsx  – 画像アップロード (Supabase Storage)
------------------------------------------------------------------ */
"use client";

import { useRef, useState, DragEvent } from "react";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";
import { supabase } from "@/lib/supabase/client";

/* -------------------- 型 -------------------- */
interface ImageUploadProps {
  /** アップロード完了時に呼ばれる (public URL) */
  onUpload: (url: string) => void;
  /** 既存画像 URL */
  initialUrl?: string;
  /** Storage バケット名 (default: "media") */
  bucket?: string;
  /** 保存先プレフィックス (default: "covers") */
  pathPrefix?: string;
  className?: string;
}

/* -------------------- util -------------------- */
function generateFileName(file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/* ================================================================ */
export default function ImageUpload({
  onUpload,
  initialUrl,
  bucket = "media",
  pathPrefix = "covers",
  className = "",
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ---- handlers ---- */
  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    setUploading(true);
    const fileName = generateFileName(file);
    const filePath = `${pathPrefix}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error(error);
      toast.error("アップロードに失敗しました");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    setPreview(publicUrl);
    setUploading(false);
    setSuccess(true);
    onUpload(publicUrl);
    toast.success("画像をアップロードしました");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div
      className={`relative h-48 w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden cursor-pointer ${className}`}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      {/* preview or placeholder */}
      {preview ? (
        <Image
          src={preview}
          alt="preview"
          fill
          className="w-full h-full object-contain"
        />
      ) : uploading ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-10">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm text-gray-600">アップロード中…</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 py-10">
          <Upload className="w-8 h-8 text-gray-500" />
          <span className="text-sm text-gray-600">
            クリックまたはドラッグ&ドロップで画像を選択
          </span>
        </div>
      )}

      {success && (
        <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-emerald-500" />
      )}
    </div>
  );
}