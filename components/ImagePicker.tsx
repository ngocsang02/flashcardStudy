"use client";

import Image from "next/image";

type Props = {
  images: string[];
  selectedImage: string;
  onSelect: (url: string) => void;
};

export function ImagePicker({ images, selectedImage, onSelect }: Props) {
  if (images.length === 0) {
    return <p className="text-sm text-slate-500">No images found. Check Unsplash API key and try another word.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {images.map((url) => {
        const selected = selectedImage === url;
        return (
          <button
            key={url}
            type="button"
            onClick={() => onSelect(url)}
            className={`overflow-hidden rounded-xl border-2 transition ${
              selected ? "border-blue-600 ring-2 ring-blue-200" : "border-transparent hover:border-blue-300"
            }`}
          >
            <Image src={url} alt="Word visual" width={300} height={220} className="h-28 w-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}
