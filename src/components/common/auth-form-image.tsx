'use client';

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function AuthFormImage() {
  const authImage = PlaceHolderImages.find((p) => p.id === 'auth-form-image-1');

  if (!authImage) return null;

  return (
    <div className="hidden md:block md:w-1/2 relative p-4">
      <div className="relative w-full h-full overflow-hidden rounded-2xl">
        <Image
          src={authImage.imageUrl}
          alt={authImage.description}
          fill
          className="object-cover object-center"
          data-ai-hint={authImage.imageHint}
          sizes="(max-width: 768px) 0vw, 50vw"
          quality={100}
          priority
        />
      </div>
    </div>
  );
}
