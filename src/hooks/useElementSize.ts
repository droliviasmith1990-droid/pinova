import { useState, useRef, useEffect } from 'react';

interface Size {
    width: number;
    height: number;
}

export function useElementSize<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [size, setSize] = useState<Size>({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setSize({ width, height });
        });

        observer.observe(ref.current);

        return () => observer.disconnect();
    }, []);

    return { ref, width: size.width, height: size.height };
}
