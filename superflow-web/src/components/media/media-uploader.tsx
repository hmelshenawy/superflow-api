"use client";

import { useRef, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export function MediaUploader({ jobId, onUploaded }: { jobId: string; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("job_id", jobId);
        form.append("filename", file.name);
        form.append("mime_type", file.type || "application/octet-stream");
        form.append("file_type", file.type.startsWith("image/") ? "photo" : file.type.startsWith("video/") ? "video" : "document");
        await api.post("/media/upload-direct", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success("Media uploaded");
      onUploaded();
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      toast.error("Failed to upload media");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />
      <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Uploading…" : "Upload Media"}
      </Button>
    </div>
  );
}
