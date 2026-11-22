'use client';
import { resolveImageUrl } from '@/lib/utils';

/** Illustrations de la correction (schémas, radios, tableaux du cours) */
export function ExplanationImages({ images, className = '' }: { images: string[]; className?: string }) {
  if (!images.length) return null;
  return (
    <div className={`space-y-3 ${className}`}>
      {images.map((src, i) => (
        <a key={i} href={resolveImageUrl(src)} target="_blank" rel="noopener noreferrer" className="block">
          <img src={resolveImageUrl(src)} alt="Illustration de la correction" loading="lazy"
            className="w-full max-h-96 object-contain rounded-xl border border-gray-100 dark:border-gray-700 bg-white" />
        </a>
      ))}
    </div>
  );
}
