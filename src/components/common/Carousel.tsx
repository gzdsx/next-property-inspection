'use client';

import Link from "next/link";
import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

export interface Slide {
    id: number;
    thumbnail: string;
    link: string;
    description: string;
}

interface CarouselProps {
    slides?: Slide[];
}

export default function Carousel({slides = []}: CarouselProps) {
    const [plugin] = React.useState(() => [Autoplay({delay: 4000, stopOnInteraction: true})]);
    const [emblaRef] = useEmblaCarousel({loop: true, dragFree: true}, plugin);

    if (slides.length === 0) return null;

    return (
        <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
                {slides.map((slide, index) => (
                    <div key={slide.id} className="flex-[0_0_100%] min-w-0">
                        <Link href={slide.link} prefetch={false} target="_blank">
                            <img
                                src={slide.thumbnail}
                                alt={`Slide ${index + 1}`}
                                className="w-full h-[40vw] md:h-[30vw] object-cover"
                            />
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
