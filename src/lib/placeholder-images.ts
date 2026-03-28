import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// Directly export the array of images
export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
