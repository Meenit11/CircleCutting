import { useEffect, useState, useRef } from 'react';
import { getEfficiencyColor } from '../utils/utils';

export default function EfficiencyRing({ percentage, size = 120, strokeWidth = 8 }) {
    const [animatedPct, setAnimatedPct] = useState(0);
    const frameRef = useRef(null);
    const startTime = useRef(null);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        startTime.current = null;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);

        const animate = (timestamp) => {
            if (!startTime.current) startTime.current = timestamp;
            const elapsed = timestamp - startTime.current;
            const progress = Math.min(elapsed / 1200, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * percentage;
            setAnimatedPct(current);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, [percentage]);

    const offset = circumference - (animatedPct / 100) * circumference;
    const color = getEfficiencyColor(animatedPct);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                />
                {/* Animated arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        filter: `drop-shadow(0 0 6px ${color}40)`,
                        transition: 'stroke 0.3s ease',
                    }}
                />
            </svg>
            {/* Center text */}
            <div className="absolute flex flex-col items-center">
                <span className="mono-num text-2xl font-bold" style={{ color }}>
                    {animatedPct.toFixed(1)}%
                </span>
                <span className="text-xs text-text-secondary mt-0.5">Efficiency</span>
            </div>
        </div>
    );
}
