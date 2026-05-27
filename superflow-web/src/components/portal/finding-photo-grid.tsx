import type { PortalPhoto } from "./types";
import { mediaUrl } from "./utils";

interface FindingPhotoGridProps {
  photos: PortalPhoto[];
  token: string;
  label?: string;
}

export function FindingPhotoGrid({ photos, token, label = "Photo" }: FindingPhotoGridProps) {
  if (!photos.length) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((photo) => (
        <a key={photo.id} href={mediaUrl(token, photo)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <img src={mediaUrl(token, photo)} alt={photo.filename || label} className="h-32 w-full object-cover sm:h-36" />
        </a>
      ))}
    </div>
  );
}
