"use client";

import { useState, useEffect, useRef } from "react";
import api, { getApiError } from "@/lib/api";
import { Trash2, Eye, FileText, Film, Image as ImageIcon } from "lucide-react";

interface MediaFile {
  id: string;
  original_filename?: string;
  file_type?: string;
  mime_type?: string;
  size_bytes?: number;
  scan_status?: string;
}

export function MediaThumbnail({ file, onDeleted }: { file: MediaFile; onDeleted: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load authenticated preview for photos
  useEffect(() => {
    if (file.file_type !== "photo" || loadedRef.current) return;
    loadedRef.current = true;

    let url: string | null = null;
    api.get(`/media/${file.id}/download`, { responseType: "blob" })
      .then((res) => {
        url = URL.createObjectURL(res.data);
        setPreviewUrl(url);
      })
      .catch((err) => console.error("Preview load error:", file.id, err));

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, file.file_type]);

  const handleView = async () => {
    const popup = window.open("", "_blank");

    try {
      const res = await api.get(`/media/${file.id}/download`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);

      if (popup) {
        popup.location.href = blobUrl;
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      const { message } = getApiError(err);
      alert(message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this file?")) return;
    setDeleting(true);
    try {
      await api.delete(`/media/${file.id}`);
      onDeleted();
    } catch {
      alert("Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPhoto = file.file_type === "photo";
  const isVideo = file.file_type === "video";
  const isPendingScan = file.scan_status === "pending" && !isPhoto;

  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-border bg-slate-50 transition-shadow hover:shadow-md">
      {/* Preview area */}
      <div className="flex h-36 items-center justify-center bg-card relative">
        {isPhoto && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.original_filename || "media"}
            className="h-full w-full object-cover"
          />
        ) : isPhoto ? (
          <ImageIcon className="h-10 w-10 text-muted-foreground/60 animate-pulse" />
        ) : isVideo ? (
          <Film className="h-10 w-10 text-muted-foreground/60" />
        ) : (
          <FileText className="h-10 w-10 text-muted-foreground/60" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleView}
            className="rounded-full bg-card p-2 text-foreground shadow hover:bg-muted"
            aria-label="Open file" title="Open file"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full bg-card p-2 text-red-600 shadow hover:bg-red-50 disabled:opacity-50"
            aria-label="Delete file"
            title="Delete file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info area */}
      <div className="border-t border-border px-3 py-2">
        <p className="truncate text-sm font-medium text-foreground">
          {file.original_filename || file.id}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">{file.file_type || "file"}</span>
          {file.size_bytes ? <span>· {formatSize(file.size_bytes)}</span> : null}
          {isPendingScan ? <span>· Pending scan</span> : null}
        </div>
      </div>
    </div>
  );
}
