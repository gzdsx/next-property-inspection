'use client';

import React, {useState} from 'react';
import Image from 'next/image';

interface ImageItem {
    src: string;
    alt?: string;
}

interface ProductImageGalleryProps {
    images: ImageItem[] | undefined;
    title?: string;
}

export default function ProductImageGallery({images, title}: ProductImageGalleryProps) {
    const allImages = images?.length ? images : [];
    const [activeIndex, setActiveIndex] = useState(0);

    if (allImages.length === 0) {
        return (
            <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden">
                <Image
                    src={allImages[activeIndex].src}
                    alt={`${title} - ${activeIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                />
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {allImages.map((img, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                                index === activeIndex ? 'border-blue-500' : 'border-gray-200 hover:border-gray-400'
                            }`}
                        >
                            <Image
                                src={img.src}
                                alt={`Thumbnail ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="64px"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
