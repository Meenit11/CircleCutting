import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/store';
import { pageTransition } from '../animations/animations';

const UNITS = [
    { key: 'mm', label: 'mm', factor: 1 },
    { key: 'cm', label: 'cm', factor: 0.1 },
    { key: 'in', label: 'in', factor: 0.03937 },
];

function formatDist(px, pxPerMm, unitObj) {
    if (!pxPerMm) return '—';
    const mm = px / pxPerMm;
    return (mm * unitObj.factor).toFixed(1) + unitObj.label;
}

function polyArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(a) / 2;
}

export default function ARScan() {
    const setScreen = useStore((s) => s.setScreen);
    const setSheet = useStore((s) => s.setSheet);
    const [points, setPoints] = useState([]);
    const [showInstructions, setShowInstructions] = useState(true);
    const [unit, setUnit] = useState(UNITS[0]);
    const [cameraError, setCameraError] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [detectedDims, setDetectedDims] = useState(null);
    const [editLength, setEditLength] = useState('');
    const [editWidth, setEditWidth] = useState('');
    const [edgeMargin, setEdgeMargin] = useState('5');
    const [kerf, setKerf] = useState('2');
    const [shape, setShape] = useState('rectangle');
    const [calibrating, setCalibrating] = useState(false);
    const [calibPoints, setCalibPoints] = useState([]);
    const [calibRefMm, setCalibRefMm] = useState('150');
    const [pxPerMm, setPxPerMm] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const containerRef = useRef(null);
    const [reticlePos, setReticlePos] = useState({ x: 0, y: 0 });

    // Start camera
    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                        setCameraReady(true);
                    };
                }
            } catch (err) {
                console.error('Camera access failed:', err);
                if (err.name === 'NotAllowedError') {
                    setCameraError('Camera permission denied. Please allow camera access and reload.');
                } else if (err.name === 'NotFoundError') {
                    setCameraError('No camera found on this device.');
                } else {
                    setCameraError('Could not access camera. You can still enter dimensions manually.');
                }
            }
        }
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    // Set reticle to center when container is available
    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setReticlePos({ x: rect.width / 2, y: rect.height / 2 });
        }
    }, [cameraReady]);

    useEffect(() => {
        const t = setTimeout(() => setShowInstructions(false), 5000);
        return () => clearTimeout(t);
    }, []);

    // Calculate polygon dimensions when 4 points placed
    useEffect(() => {
        if (points.length === 4 && pxPerMm) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const len = Math.round((maxX - minX) / pxPerMm);
            const wid = Math.round((maxY - minY) / pxPerMm);
            setDetectedDims({ length: len, width: wid });
            setEditLength(len.toString());
            setEditWidth(wid.toString());
        } else if (points.length === 4 && !pxPerMm) {
            // Fallback: rough estimate using 2.5px/mm ratio
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const len = Math.round((maxX - minX) * 0.4);
            const wid = Math.round((maxY - minY) * 0.4);
            setDetectedDims({ length: len, width: wid });
            setEditLength(len.toString());
            setEditWidth(wid.toString());
        }
    }, [points, pxPerMm]);

    const handlePlacePoint = useCallback(() => {
        if (calibrating) {
            if (calibPoints.length < 2) {
                const newPts = [...calibPoints, { ...reticlePos }];
                setCalibPoints(newPts);
                if (newPts.length === 2) {
                    const dx = newPts[1].x - newPts[0].x;
                    const dy = newPts[1].y - newPts[0].y;
                    const pxDist = Math.sqrt(dx * dx + dy * dy);
                    const refMm = Number(calibRefMm) || 150;
                    setPxPerMm(pxDist / refMm);
                    setCalibrating(false);
                    setCalibPoints([]);
                }
            }
            return;
        }
        if (points.length >= 4) return;
        setPoints(prev => [...prev, { ...reticlePos }]);
    }, [calibrating, calibPoints, reticlePos, calibRefMm, points.length]);

    const handleUndo = () => {
        if (calibrating && calibPoints.length > 0) {
            setCalibPoints(prev => prev.slice(0, -1));
            return;
        }
        if (points.length > 0) {
            setPoints(prev => prev.slice(0, -1));
            setDetectedDims(null);
        }
    };

    const handleClear = () => {
        setPoints([]);
        setDetectedDims(null);
        setCalibPoints([]);
    };

    const handleConfirm = () => {
        const l = Number(editLength);
        const w = shape === 'square' ? l : Number(editWidth);
        if (l > 0 && w > 0) {
            setSheet({
                length: l.toString(),
                width: w.toString(),
                shape,
                edgeMargin: Number(edgeMargin) || 5,
                kerf: Number(kerf) || 2,
            });
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            setScreen('circleConfig');
        }
    };

    const handleGoManual = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setScreen('manualEntry');
    };

    const distBetween = (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

    return (
        <motion.div
            className="h-screen flex flex-col"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gunmetal/90 backdrop-blur-sm border-b border-border z-20 flex-shrink-0">
                <button
                    onClick={() => {
                        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                        setScreen('home');
                    }}
                    className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                    ← Back
                </button>

                {/* Unit toggle */}
                <div className="flex bg-ocean-800 rounded overflow-hidden border border-border">
                    {UNITS.map(u => (
                        <button
                            key={u.key}
                            className={`px-2.5 py-1 text-xs mono-num transition-all ${unit.key === u.key ? 'bg-teal/20 text-teal' : 'text-text-dim hover:text-text-secondary'}`}
                            onClick={() => setUnit(u)}
                        >
                            {u.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 bg-amber/15 text-amber text-xs px-2 py-1 rounded">
                    ⚠️ Estimate
                </div>
            </div>

            {/* Camera area - tap to move reticle */}
            <div
                className="flex-1 relative bg-ocean-950 overflow-hidden cursor-crosshair"
                ref={containerRef}
                onClick={(e) => {
                    if (points.length >= 4) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setReticlePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
            >
                {/* Live camera feed */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Loading spinner */}
                {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ocean-950">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-2 border-teal/30 border-t-teal rounded-full"
                        />
                    </div>
                )}

                {/* Camera error state */}
                {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ocean-950 px-6">
                        <div className="text-center max-w-sm">
                            <div className="text-3xl mb-3">📷</div>
                            <p className="text-sm text-text-secondary mb-4">{cameraError}</p>
                            <button
                                onClick={handleGoManual}
                                className="px-5 py-2.5 rounded-lg bg-buoy text-white text-sm font-medium hover:bg-buoy/90 transition-colors"
                            >
                                Enter Dimensions Manually →
                            </button>
                        </div>
                    </div>
                )}

                {/* Semi-transparent overlay */}
                {cameraReady && <div className="absolute inset-0 bg-ocean-950/15 pointer-events-none" />}
                <div className="absolute inset-0 blueprint-bg opacity-15 pointer-events-none" />

                {/* Scan line */}
                {cameraReady && points.length < 4 && !calibrating && (
                    <motion.div
                        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent opacity-30 pointer-events-none"
                        animate={{ top: ['10%', '90%', '10%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                )}

                {/* CENTER RETICLE — always visible */}
                {cameraReady && points.length < 4 && (
                    <div
                        className="absolute pointer-events-none z-10"
                        style={{ left: reticlePos.x - 24, top: reticlePos.y - 24 }}
                    >
                        <svg width="48" height="48" viewBox="0 0 48 48">
                            {/* Outer ring */}
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#3fb8a0" strokeWidth="1" opacity="0.3" />
                            {/* Cross hairs */}
                            <line x1="24" y1="4" x2="24" y2="16" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.6" />
                            <line x1="24" y1="32" x2="24" y2="44" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.6" />
                            <line x1="4" y1="24" x2="16" y2="24" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.6" />
                            <line x1="32" y1="24" x2="44" y2="24" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.6" />
                            {/* Center dot */}
                            <circle cx="24" cy="24" r="3" fill="#3fb8a0" opacity="0.9" />
                        </svg>
                        {/* Pulsing glow ring */}
                        <motion.div
                            className="absolute rounded-full border border-teal pointer-events-none"
                            style={{ top: 4, left: 4, width: 40, height: 40 }}
                            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    </div>
                )}

                {/* Calibration reticle mode */}
                {calibrating && cameraReady && (
                    <div
                        className="absolute pointer-events-none z-10"
                        style={{ left: reticlePos.x - 24, top: reticlePos.y - 24 }}
                    >
                        <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#e8a838" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
                            <circle cx="24" cy="24" r="3" fill="#e8a838" />
                        </svg>
                    </div>
                )}

                {/* Instructions */}
                <AnimatePresence>
                    {showInstructions && points.length === 0 && !calibrating && (
                        <motion.div
                            className="absolute inset-x-0 top-1/4 flex justify-center pointer-events-none z-10"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="bg-gunmetal/90 backdrop-blur-sm rounded-lg px-6 py-4 max-w-xs text-center border border-border pointer-events-auto"
                                onClick={(e) => { e.stopPropagation(); setShowInstructions(false); }}>
                                <p className="text-sm text-text-primary mb-1">Aim the reticle at a sheet corner</p>
                                <p className="text-xs text-text-secondary">Press "Place Point" to mark each corner</p>
                                <p className="text-xs text-text-dim mt-2">💡 Calibrate first for better accuracy</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Placed points */}
                {points.map((p, i) => (
                    <motion.div
                        key={i}
                        className="absolute pointer-events-none z-10"
                        style={{ left: p.x - 14, top: p.y - 14 }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28">
                            <circle cx="14" cy="14" r="10" fill="none" stroke="#3fb8a0" strokeWidth="2" />
                            <circle cx="14" cy="14" r="3" fill="#3fb8a0" />
                        </svg>
                        {/* Ring pulse */}
                        <motion.div
                            className="absolute rounded-full border-2 border-teal pointer-events-none"
                            style={{ top: 3, left: 3, width: 22, height: 22 }}
                            initial={{ scale: 1, opacity: 0.7 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            transition={{ duration: 0.8 }}
                        />
                        {/* Point label */}
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs mono-num text-teal bg-gunmetal/80 px-1.5 py-0.5 rounded">
                            {i + 1}
                        </span>
                    </motion.div>
                ))}

                {/* Calibration points */}
                {calibPoints.map((p, i) => (
                    <motion.div
                        key={`cal-${i}`}
                        className="absolute pointer-events-none z-10"
                        style={{ left: p.x - 8, top: p.y - 8 }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                        <svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="none" stroke="#e8a838" strokeWidth="2" /><circle cx="8" cy="8" r="2" fill="#e8a838" /></svg>
                    </motion.div>
                ))}

                {/* Lines between points + distance labels */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-5">
                    {/* Lines between placed points */}
                    {points.map((p, i) => {
                        if (i === 0) return null;
                        const prev = points[i - 1];
                        const dist = distBetween(prev, p);
                        const midX = (prev.x + p.x) / 2;
                        const midY = (prev.y + p.y) / 2;
                        return (
                            <g key={`line-${i}`}>
                                <motion.line
                                    x1={prev.x} y1={prev.y}
                                    x2={p.x} y2={p.y}
                                    stroke="#3fb8a0"
                                    strokeWidth="2"
                                    strokeDasharray="6 3"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 0.9 }}
                                    transition={{ duration: 0.4 }}
                                />
                                <rect x={midX - 28} y={midY - 12} width="56" height="18" rx="4" fill="#121e2a" fillOpacity="0.85" stroke="#3fb8a0" strokeWidth="0.5" />
                                <text x={midX} y={midY + 2} textAnchor="middle" fill="#3fb8a0" fontSize="10" fontFamily="'JetBrains Mono', monospace">
                                    {formatDist(dist, pxPerMm, unit)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Closing line (4→1) */}
                    {points.length === 4 && (
                        <g>
                            <motion.line
                                x1={points[3].x} y1={points[3].y}
                                x2={points[0].x} y2={points[0].y}
                                stroke="#3fb8a0"
                                strokeWidth="2"
                                strokeDasharray="6 3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.9 }}
                                transition={{ duration: 0.4, delay: 0.15 }}
                            />
                            {(() => {
                                const dist = distBetween(points[3], points[0]);
                                const midX = (points[3].x + points[0].x) / 2;
                                const midY = (points[3].y + points[0].y) / 2;
                                return (
                                    <>
                                        <rect x={midX - 28} y={midY - 12} width="56" height="18" rx="4" fill="#121e2a" fillOpacity="0.85" stroke="#3fb8a0" strokeWidth="0.5" />
                                        <text x={midX} y={midY + 2} textAnchor="middle" fill="#3fb8a0" fontSize="10" fontFamily="'JetBrains Mono', monospace">
                                            {formatDist(dist, pxPerMm, unit)}
                                        </text>
                                    </>
                                );
                            })()}
                        </g>
                    )}

                    {/* Preview line from last point to reticle */}
                    {points.length > 0 && points.length < 4 && (
                        <line
                            x1={points[points.length - 1].x}
                            y1={points[points.length - 1].y}
                            x2={reticlePos.x}
                            y2={reticlePos.y}
                            stroke="#3fb8a0"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.4"
                        />
                    )}

                    {/* Calibration line */}
                    {calibPoints.length === 1 && (
                        <line
                            x1={calibPoints[0].x} y1={calibPoints[0].y}
                            x2={reticlePos.x} y2={reticlePos.y}
                            stroke="#e8a838" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6"
                        />
                    )}
                </svg>
            </div>

            {/* Bottom panel */}
            <motion.div
                className="bg-gunmetal/95 backdrop-blur-md border-t border-border px-4 py-3 flex-shrink-0 z-20"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {/* CALIBRATION MODE */}
                {calibrating ? (
                    <div className="text-center">
                        <div className="mono-num text-sm text-amber mb-2">
                            📏 Calibration: Aim reticle at {calibPoints.length === 0 ? 'one end' : 'the other end'} of a known object
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <label className="text-xs text-text-dim">Reference length:</label>
                            <input
                                type="number"
                                value={calibRefMm}
                                onChange={(e) => setCalibRefMm(e.target.value)}
                                className="w-20 bg-ocean-800 border border-border rounded px-2 py-1 text-sm mono-num text-text-primary text-center focus:outline-none focus:border-amber/50"
                            />
                            <span className="text-xs text-text-dim">mm</span>
                        </div>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={handlePlacePoint}
                                className="px-6 py-2.5 rounded-lg bg-amber text-ocean-950 font-semibold text-sm hover:bg-amber/90 transition-colors"
                            >
                                Mark Point {calibPoints.length + 1} / 2
                            </button>
                            <button
                                onClick={() => { setCalibrating(false); setCalibPoints([]); }}
                                className="px-4 py-2.5 rounded-lg border border-border text-text-secondary text-sm hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : points.length < 4 ? (
                    /* MEASUREMENT MODE */
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="mono-num text-sm text-teal">
                                Point {points.length + 1} of 4
                            </div>
                            <div className="flex gap-1.5">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < points.length ? 'bg-teal scale-110' : 'bg-steel'}`} />
                                ))}
                            </div>
                        </div>

                        {/* Place Point button — big and prominent */}
                        <button
                            onClick={handlePlacePoint}
                            className="w-full py-3.5 rounded-lg bg-teal text-ocean-950 font-bold text-base mb-2 hover:bg-teal/90 transition-colors active:scale-[0.98]"
                        >
                            ＋ Place Point
                        </button>

                        {/* Action row: Undo, Clear, Calibrate, Manual */}
                        <div className="flex items-center justify-between">
                            <div className="flex gap-3">
                                {points.length > 0 && (
                                    <button
                                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                                        onClick={handleUndo}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h8M3 7l3-3M3 7l3 3" /></svg>
                                        Undo
                                    </button>
                                )}
                                {points.length > 0 && (
                                    <button
                                        className="text-xs text-danger/70 hover:text-danger transition-colors"
                                        onClick={handleClear}
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                {!pxPerMm && (
                                    <button
                                        className="text-xs text-amber hover:text-amber/80 transition-colors"
                                        onClick={() => { setCalibrating(true); setCalibPoints([]); }}
                                    >
                                        📏 Calibrate
                                    </button>
                                )}
                                {pxPerMm && (
                                    <span className="text-xs text-seafoam/60">✓ Calibrated</span>
                                )}
                                <button
                                    className="text-xs text-buoy hover:text-buoy/80 transition-colors"
                                    onClick={handleGoManual}
                                >
                                    Manual entry →
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* CONFIRMATION PANEL — 4 points placed */
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {/* Shape selector */}
                        <div className="flex gap-2">
                            {['rectangle', 'square'].map(s => (
                                <button
                                    key={s}
                                    className={`flex-1 py-1.5 rounded text-sm capitalize transition-all ${shape === s ? 'bg-teal/15 text-teal border border-teal/30' : 'bg-ocean-800 text-text-secondary border border-border'}`}
                                    onClick={() => setShape(s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Dimension inputs */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs text-text-dim mb-1 block">Length (mm)</label>
                                <input
                                    type="number"
                                    value={editLength}
                                    onChange={(e) => setEditLength(e.target.value)}
                                    className="w-full bg-ocean-800 border border-border rounded px-3 py-2 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50"
                                />
                            </div>
                            {shape === 'rectangle' && (
                                <div className="flex-1">
                                    <label className="text-xs text-text-dim mb-1 block">Width (mm)</label>
                                    <input
                                        type="number"
                                        value={editWidth}
                                        onChange={(e) => setEditWidth(e.target.value)}
                                        className="w-full bg-ocean-800 border border-border rounded px-3 py-2 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Edge Margin & Kerf — NEW for AR flow */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs text-text-dim mb-1 block">Edge Margin (mm)</label>
                                <input
                                    type="number"
                                    value={edgeMargin}
                                    onChange={(e) => setEdgeMargin(e.target.value)}
                                    className="w-full bg-ocean-800 border border-border rounded px-3 py-2 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50"
                                />
                                <p className="text-[10px] text-text-dim mt-1">How far from the edge to keep cuts</p>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-text-dim mb-1 block">Kerf Width (mm)</label>
                                <input
                                    type="number"
                                    value={kerf}
                                    onChange={(e) => setKerf(e.target.value)}
                                    className="w-full bg-ocean-800 border border-border rounded px-3 py-2 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50"
                                />
                                <p className="text-[10px] text-text-dim mt-1">Blade/laser cut thickness</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-amber">
                            ⚠️ Camera estimates are rough. Adjust dimensions above if needed.
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setPoints([]); setDetectedDims(null); }}
                                className="px-4 py-3 rounded-lg border border-border text-text-secondary text-sm hover:text-text-primary transition-colors"
                            >
                                ↩ Remeasure
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-3 rounded-lg bg-buoy text-white font-semibold text-sm hover:bg-buoy/90 transition-colors"
                            >
                                Confirm Dimensions →
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
