import { useEffect, useRef, useState } from 'react';

interface Options {
    onRefresh: () => Promise<void> | void;
    threshold?: number;
    enabled?: boolean;
}

export const usePullToRefresh = ({ onRefresh, threshold = 80, enabled = true }: Options) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const startYRef = useRef<number | null>(null);
    const pullDistanceRef = useRef(0);
    const refreshingRef = useRef(false);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    useEffect(() => {
        if (!enabled) return;

        const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
        if (!isCoarsePointer) return;

        const setPull = (d: number) => {
            pullDistanceRef.current = d;
            setPullDistance(d);
        };

        const onTouchStart = (e: TouchEvent) => {
            if (window.scrollY > 0 || refreshingRef.current) return;
            startYRef.current = e.touches[0].clientY;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (startYRef.current === null) return;
            if (window.scrollY > 0) {
                startYRef.current = null;
                setPull(0);
                return;
            }

            const delta = e.touches[0].clientY - startYRef.current;
            if (delta <= 0) {
                if (pullDistanceRef.current !== 0) setPull(0);
                return;
            }

            // Damp past threshold so it feels rubbery, not infinite.
            const damped = delta > threshold ? threshold + (delta - threshold) * 0.4 : delta;
            setPull(damped);

            // Suppress Safari's native pull-to-refresh-and-reload while we drive our own.
            if (e.cancelable) e.preventDefault();
        };

        const onTouchEnd = async () => {
            if (startYRef.current === null) return;
            const wasOver = pullDistanceRef.current >= threshold;
            startYRef.current = null;

            if (wasOver && !refreshingRef.current) {
                refreshingRef.current = true;
                setRefreshing(true);
                setPull(threshold);
                try {
                    await onRefreshRef.current();
                } finally {
                    refreshingRef.current = false;
                    setRefreshing(false);
                    setPull(0);
                }
            } else {
                setPull(0);
            }
        };

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);

        return () => {
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [enabled, threshold]);

    return { pullDistance, refreshing };
};
