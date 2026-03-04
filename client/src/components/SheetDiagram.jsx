import { motion } from 'framer-motion';
import { circlePop } from '../animations/animations';
import { useStore } from '../store/store';
import { useState, useRef } from 'react';

export default function SheetDiagram({ width: containerWidth = 500, height: containerHeight = 400 }) {
    const results = useStore((s) => s.results);
    const selectedSuggestions = useStore((s) => s.selectedSuggestions);
    const [tooltip, setTooltip] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);
    const isPanning = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    if (!results) return null;

    const { stats, circles, leftoverZones } = results;
    const sheetW = stats.totalArea / (stats.totalArea / (Number(results.stats.edgeMargin) * 2 + circles.reduce((max, c) => Math.max(max, c.x + c.r), 0) + 10));

    // Compute actual sheet dims from the API stats
    // We need length and width — derive from totalArea if possible
    // Actually, let's compute from circle positions
    const allX = circles.map(c => c.x + c.r);
    const allY = circles.map(c => c.y + c.r);

    // Get sheet dimensions from store
    const sheet = useStore.getState().sheet;
    const sheetLength = Number(sheet.length) || Math.max(...allX) + 10;
    const sheetWidth = Number(sheet.width) || Math.max(...allY) + 10;

    // Scale to fit container
    const padding = 30;
    const scaleX = (containerWidth - padding * 2) / sheetLength;
    const scaleY = (containerHeight - padding * 2) / sheetWidth;
    const scale = Math.min(scaleX, scaleY);

    const svgW = sheetLength * scale;
    const svgH = sheetWidth * scale;
    const offsetX = (containerWidth - svgW) / 2;
    const offsetY = (containerHeight - svgH) / 2;

    // Gather selected suggestion circles
    const suggestionCircles = [];
    if (leftoverZones) {
        for (const zone of leftoverZones) {
            const selIdx = selectedSuggestions[zone.id];
            if (selIdx !== undefined && zone.suggestions[selIdx]) {
                for (const c of zone.suggestions[selIdx].circles) {
                    suggestionCircles.push(c);
                }
            }
        }
    }

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
    };

    const handlePointerDown = (e) => {
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handlePointerMove = (e) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    };
    const handlePointerUp = () => { isPanning.current = false; };

    return (
        <div className="relative w-full select-none" style={{ height: containerHeight }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${containerWidth} ${containerHeight}`}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="cursor-grab active:cursor-grabbing"
            >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: `${containerWidth / 2}px ${containerHeight / 2}px` }}>
                    <g transform={`translate(${offsetX}, ${offsetY})`}>
                        {/* Sheet background */}
                        <rect
                            x={0} y={0}
                            width={svgW} height={svgH}
                            fill="rgba(18, 30, 42, 0.6)"
                            stroke="#3fb8a0"
                            strokeWidth={1.5}
                            rx={2}
                        />

                        {/* Corner brackets */}
                        <path d={`M 0,12 L 0,0 L 12,0`} fill="none" stroke="#3fb8a0" strokeWidth={2} opacity={0.6} />
                        <path d={`M ${svgW - 12},0 L ${svgW},0 L ${svgW},12`} fill="none" stroke="#3fb8a0" strokeWidth={2} opacity={0.6} />
                        <path d={`M ${svgW},${svgH - 12} L ${svgW},${svgH} L ${svgW - 12},${svgH}`} fill="none" stroke="#3fb8a0" strokeWidth={2} opacity={0.6} />
                        <path d={`M 12,${svgH} L 0,${svgH} L 0,${svgH - 12}`} fill="none" stroke="#3fb8a0" strokeWidth={2} opacity={0.6} />

                        {/* Dimension labels */}
                        <text x={svgW / 2} y={-8} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="'JetBrains Mono', monospace">
                            {sheetLength}mm
                        </text>
                        <text x={-8} y={svgH / 2} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="'JetBrains Mono', monospace"
                            transform={`rotate(-90, -8, ${svgH / 2})`}>
                            {sheetWidth}mm
                        </text>

                        {/* Leftover zones */}
                        {leftoverZones && leftoverZones.map(zone => (
                            <motion.rect
                                key={zone.id}
                                x={zone.x * scale}
                                y={zone.y * scale}
                                width={zone.width * scale}
                                height={zone.height * scale}
                                fill="rgba(245, 158, 11, 0.08)"
                                stroke="#f59e0b"
                                strokeWidth={1}
                                strokeDasharray="4 3"
                                opacity={0.6}
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                        ))}

                        {/* Primary circles */}
                        {circles.map((c, i) => (
                            <motion.circle
                                key={`primary-${i}`}
                                cx={c.x * scale}
                                cy={c.y * scale}
                                r={c.r * scale}
                                fill="rgba(224, 90, 48, 0.15)"
                                stroke="#e05a30"
                                strokeWidth={1}
                                custom={i}
                                variants={circlePop}
                                initial="initial"
                                animate="animate"
                                onClick={() => setTooltip(tooltip === i ? null : i)}
                                className="cursor-pointer"
                                style={{ filter: tooltip === i ? 'drop-shadow(0 0 6px rgba(255,107,53,0.5))' : 'none' }}
                            />
                        ))}

                        {/* Suggestion circles */}
                        {suggestionCircles.map((c, i) => (
                            <motion.circle
                                key={`suggest-${i}`}
                                cx={c.x * scale}
                                cy={c.y * scale}
                                r={c.r * scale}
                                fill="rgba(78, 205, 196, 0.18)"
                                stroke="#4ecdc4"
                                strokeWidth={1}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 20 }}
                            />
                        ))}

                        {/* Tooltip */}
                        {tooltip !== null && circles[tooltip] && (
                            <g>
                                <rect
                                    x={circles[tooltip].x * scale - 22}
                                    y={circles[tooltip].y * scale - 28}
                                    width={44} height={18} rx={4}
                                    fill="#121e2a" stroke="#3fb8a0" strokeWidth={0.5}
                                />
                                <text
                                    x={circles[tooltip].x * scale}
                                    y={circles[tooltip].y * scale - 16}
                                    textAnchor="middle" fill="#e2e8f0" fontSize={9}
                                    fontFamily="'JetBrains Mono', monospace"
                                >
                                    r{circles[tooltip].r}mm
                                </text>
                            </g>
                        )}
                    </g>
                </g>
            </svg>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 flex gap-1">
                <button
                    className="w-8 h-8 rounded bg-gunmetal border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-bright transition-colors"
                    onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                >+</button>
                <button
                    className="w-8 h-8 rounded bg-gunmetal border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-bright transition-colors"
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                >−</button>
                <button
                    className="w-8 h-8 rounded bg-gunmetal border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-bright transition-colors text-xs"
                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                >⟳</button>
            </div>
        </div>
    );
}
