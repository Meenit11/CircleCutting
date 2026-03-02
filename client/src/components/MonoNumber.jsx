import { useEffect, useRef, useState } from 'react';

export default function MonoNumber({ value, duration = 800, decimals = 0, suffix = '', prefix = '' }) {
    const [display, setDisplay] = useState(0);
    const frameRef = useRef(null);
    const startTime = useRef(null);
    const startVal = useRef(0);

    useEffect(() => {
        const target = Number(value) || 0;
        startVal.current = display;
        startTime.current = null;

        if (frameRef.current) cancelAnimationFrame(frameRef.current);

        const animate = (timestamp) => {
            if (!startTime.current) startTime.current = timestamp;
            const elapsed = timestamp - startTime.current;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startVal.current + (target - startVal.current) * eased;
            setDisplay(current);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, [value, duration]);

    return (
        <span className="mono-num">
            {prefix}{display.toFixed(decimals)}{suffix}
        </span>
    );
}
