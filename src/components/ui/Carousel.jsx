import React, { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './Button';

const CarouselContext = React.createContext({});

export const Carousel = ({ children, opts, orientation = 'horizontal', className }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...opts,
    axis: orientation === 'horizontal' ? 'x' : 'y',
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
    }
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
    }
  }, [emblaApi]);

  const handleKeyDown = React.useCallback(
    (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  React.useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => emblaApi.off('select', onSelect);
  }, [emblaApi]);

  return (
    <CarouselContext.Provider
      value={{
        emblaApi,
        canScrollPrev,
        canScrollNext,
        scrollPrev,
        scrollNext,
      }}
    >
      <div
        onKeyDown={handleKeyDown}
        className={`relative ${className || ''}`}
        role="region"
        aria-roledescription="carousel"
      >
        <div ref={emblaRef} className="overflow-hidden">
          {children}
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const CarouselContent = ({ children, className }) => {
  return (
    <div className="flex" role="list">
      <div className={`flex ${className || ''}`}>{children}</div>
    </div>
  );
};

export const CarouselItem = ({ children, className }) => {
  return (
    <div
      className={`min-w-0 shrink-0 grow-0 basis-full pl-4 ${className || ''}`}
      role="listitem"
    >
      {children}
    </div>
  );
};

export const CarouselPrevious = ({ className, ...props }) => {
  const { emblaApi, canScrollPrev, scrollPrev } = React.useContext(CarouselContext);

  return (
    <Button
      variant="outline"
      size="icon"
      className={`absolute h-8 w-8 rounded-full -translate-y-1/2 top-1/2 left-4 z-10 ${className || ''}`}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      aria-label="Previous slide"
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
};

export const CarouselNext = ({ className, ...props }) => {
  const { emblaApi, canScrollNext, scrollNext } = React.useContext(CarouselContext);

  return (
    <Button
      variant="outline"
      size="icon"
      className={`absolute h-8 w-8 rounded-full -translate-y-1/2 top-1/2 right-4 z-10 ${className || ''}`}
      disabled={!canScrollNext}
      onClick={scrollNext}
      aria-label="Next slide"
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
};