import { type RefObject, useCallback, useEffect } from "react";

interface UseInfiniteScrollOptions {
  enabled: boolean;
  threshold?: number;
}

export function useInfiniteScroll(
  ref: RefObject<HTMLElement | null>,
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions
) {
  const { enabled, threshold = 0.1 } = options;

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    },
    [onLoadMore]
  );

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(handleIntersection, { threshold });

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref, handleIntersection, enabled, threshold]);
}
