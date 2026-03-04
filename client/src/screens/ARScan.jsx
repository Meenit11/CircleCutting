import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { pageTransition } from '../animations/animations';

// Step-based measurement: camera is a viewfinder, points go on a fixed diagram
const CORNER_LABELS = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'];
const CORNER_POSITIONS = [
    { x: 20, y: 20 },   // TL
    { x: 180, y: 20 },  // TR
    { x: 180, y: 120 }, // BR
    { x: 20, y: 120 },  // BL
];

export default function ARScan() {
    const setScreen = useStore((s) => s.setScreen);
    const setSheet = useStore((s) => s.setSheet);
    const [step, setStep] = useState(0); // 0-3 = placing corners, 4 = confirm
    const [placedCorners, setPlacedCorners] = useState([false, false, false, false]);
    const [editLength, setEditLength] = useState('');
    const [editWidth, setEditWidth] = useState('');
    const [edgeMargin, setEdgeMargin] = useState('5');
    const [kerf, setKerf] = useState('2');
    const [shape, setShape] = useState('rectangle');
    const [cameraError, setCameraError] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

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
                    setCameraError('Camera permission denied.');
                } else if (err.name === 'NotFoundError') {
                    setCameraError('No camera found.');
                } else {
                    setCameraError('Could not access camera.');
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

    const handleMarkCorner = () => {
        if (step >= 4) return;
        const next = [...placedCorners];
        next[step] = true;
        setPlacedCorners(next);
        if (step < 3) {
            setStep(step + 1);
        } else {
            setStep(4); // all 4 placed → show confirm
        }
    };

    const handleUndo = () => {
        if (step === 4) {
            // Go back to last corner
            const next = [...placedCorners];
            next[3] = false;
            setPlacedCorners(next);
            setStep(3);
        } else if (step > 0) {
            const next = [...placedCorners];
            next[step - 1] = false;
            setPlacedCorners(next);
            setStep(step - 1);
        }
    };

    const handleClear = () => {
        setStep(0);
        setPlacedCorners([false, false, false, false]);
        setEditLength('');
        setEditWidth('');
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

    const placedCount = placedCorners.filter(Boolean).length;

    return (
        <motion.div
            className="h-screen flex flex-col bg-ocean-950"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Top bar - compact for mobile */}
            <div className="flex items-center justify-between px-3 py-2 bg-gunmetal/90 backdrop-blur-sm border-b border-border z-20 flex-shrink-0">
                <button
                    onClick={() => {
                        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                        setScreen('home');
                    }}
                    className="text-text-secondary hover:text-text-primary transition-colors text-sm p-1"
                >
                    ← Back
                </button>
                <h2 className="text-sm font-medium text-text-primary">Scan Sheet</h2>
                <div className="flex items-center gap-1 bg-amber/15 text-amber text-[10px] px-2 py-1 rounded">
                    ⚠ Estimate
                </div>
            </div>

            {/* Camera viewfinder - takes ~50% of screen */}
            <div className="relative flex-shrink-0" style={{ height: '45vh' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Loading */}
                {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ocean-950">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-2 border-teal/30 border-t-teal rounded-full"
                        />
                    </div>
                )}

                {/* Error */}
                {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ocean-950 px-6">
                        <div className="text-3xl mb-2">📷</div>
                        <p className="text-sm text-text-secondary mb-3 text-center">{cameraError}</p>
                        <button
                            onClick={handleGoManual}
                            className="px-5 py-2.5 rounded-lg bg-buoy text-white text-sm font-medium"
                        >
                            Enter Manually →
                        </button>
                    </div>
                )}

                {/* Center reticle on camera */}
                {cameraReady && step < 4 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg width="56" height="56" viewBox="0 0 56 56">
                            <circle cx="28" cy="28" r="24" fill="none" stroke="#3fb8a0" strokeWidth="1" opacity="0.3" />
                            <line x1="28" y1="4" x2="28" y2="18" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.5" />
                            <line x1="28" y1="38" x2="28" y2="52" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.5" />
                            <line x1="4" y1="28" x2="18" y2="28" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.5" />
                            <line x1="38" y1="28" x2="52" y2="28" stroke="#3fb8a0" strokeWidth="1.5" opacity="0.5" />
                            <circle cx="28" cy="28" r="3" fill="#3fb8a0" opacity="0.8" />
                        </svg>
                        {/* Pulsing ring */}
                        <motion.div
                            className="absolute rounded-full border border-teal"
                            style={{ width: 48, height: 48 }}
                            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    </div>
                )}

                {/* Grid overlay */}
                <div className="absolute inset-0 blueprint-bg opacity-10 pointer-events-none" />

                {/* Step indicator overlay */}
                {cameraReady && step < 4 && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <div className="bg-gunmetal/80 backdrop-blur-sm rounded px-3 py-1.5 border border-border">
                            <span className="text-xs text-text-secondary">Aim at </span>
                            <span className="text-xs text-teal font-medium">{CORNER_LABELS[step]}</span>
                        </div>
                        <div className="flex gap-1.5">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < placedCount ? 'bg-teal' : i === step ? 'bg-teal/40 animate-pulse' : 'bg-steel'}`} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Scan line */}
                {cameraReady && step < 4 && (
                    <motion.div
                        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent opacity-25 pointer-events-none"
                        animate={{ top: ['15%', '85%', '15%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                )}
            </div>

            {/* Bottom section - measurement diagram + controls */}
            <div className="flex-1 flex flex-col bg-gunmetal/95 backdrop-blur-md border-t border-border overflow-y-auto">

                {step < 4 ? (
                    /* MEASUREMENT MODE */
                    <div className="flex-1 flex flex-col px-4 py-3">
                        {/* Fixed measurement diagram - doesn't move with camera */}
                        <div className="flex-1 flex items-center justify-center mb-3">
                            <svg width="200" height="140" viewBox="0 0 200 140" className="drop-shadow-lg">
                                {/* Sheet outline */}
                                <rect x="20" y="20" width="160" height="100" fill="rgba(18, 30, 42, 0.8)" stroke="#3fb8a0" strokeWidth="1" strokeDasharray="4 3" rx="2" opacity="0.5" />

                                {/* Corner points - fixed positions */}
                                {CORNER_POSITIONS.map((pos, i) => (
                                    <g key={i}>
                                        {/* Corner marker */}
                                        <circle
                                            cx={pos.x} cy={pos.y} r={placedCorners[i] ? 6 : 4}
                                            fill={placedCorners[i] ? '#3fb8a0' : 'transparent'}
                                            stroke={i === step ? '#3fb8a0' : placedCorners[i] ? '#3fb8a0' : '#5a6e80'}
                                            strokeWidth={i === step ? 2 : 1}
                                            opacity={placedCorners[i] ? 1 : i === step ? 0.8 : 0.4}
                                        />
                                        {/* Pulse ring on current */}
                                        {i === step && !placedCorners[i] && (
                                            <motion.circle
                                                cx={pos.x} cy={pos.y} r="8"
                                                fill="none" stroke="#3fb8a0" strokeWidth="1"
                                                animate={{ r: [8, 14, 8], opacity: [0.5, 0, 0.5] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            />
                                        )}
                                        {/* Label */}
                                        <text x={pos.x} y={pos.y + (pos.y < 70 ? -10 : 18)} textAnchor="middle" fill={placedCorners[i] ? '#3fb8a0' : '#5a6e80'} fontSize="8" fontFamily="'JetBrains Mono', monospace">
                                            {i + 1}
                                        </text>
                                    </g>
                                ))}

                                {/* Lines between placed corners */}
                                {placedCorners[0] && placedCorners[1] && (
                                    <motion.line x1={CORNER_POSITIONS[0].x} y1={CORNER_POSITIONS[0].y} x2={CORNER_POSITIONS[1].x} y2={CORNER_POSITIONS[1].y} stroke="#3fb8a0" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
                                )}
                                {placedCorners[1] && placedCorners[2] && (
                                    <motion.line x1={CORNER_POSITIONS[1].x} y1={CORNER_POSITIONS[1].y} x2={CORNER_POSITIONS[2].x} y2={CORNER_POSITIONS[2].y} stroke="#3fb8a0" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
                                )}
                                {placedCorners[2] && placedCorners[3] && (
                                    <motion.line x1={CORNER_POSITIONS[2].x} y1={CORNER_POSITIONS[2].y} x2={CORNER_POSITIONS[3].x} y2={CORNER_POSITIONS[3].y} stroke="#3fb8a0" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
                                )}
                                {placedCorners[3] && placedCorners[0] && (
                                    <motion.line x1={CORNER_POSITIONS[3].x} y1={CORNER_POSITIONS[3].y} x2={CORNER_POSITIONS[0].x} y2={CORNER_POSITIONS[0].y} stroke="#3fb8a0" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
                                )}

                                {/* Dimension labels */}
                                {placedCorners[0] && placedCorners[1] && (
                                    <text x="100" y="14" textAnchor="middle" fill="#8a9baa" fontSize="9" fontFamily="'JetBrains Mono', monospace">Length</text>
                                )}
                                {placedCorners[1] && placedCorners[2] && (
                                    <text x="192" y="72" textAnchor="start" fill="#8a9baa" fontSize="9" fontFamily="'JetBrains Mono', monospace">W</text>
                                )}
                            </svg>
                        </div>

                        {/* MARK CORNER button - large, thumb-friendly */}
                        <button
                            onClick={handleMarkCorner}
                            className="w-full py-4 rounded-xl bg-teal text-ocean-950 font-bold text-base mb-3 active:scale-[0.97] transition-transform"
                            style={{ minHeight: 52 }}
                        >
                            ✓ Mark {CORNER_LABELS[step]} Corner
                        </button>

                        {/* Action row */}
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                                {placedCount > 0 && (
                                    <button className="flex items-center gap-1.5 text-sm text-text-secondary active:text-text-primary py-2" onClick={handleUndo} style={{ minHeight: 44 }}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8h8M4 8l3-3M4 8l3 3" /></svg>
                                        Undo
                                    </button>
                                )}
                                {placedCount > 0 && (
                                    <button className="text-sm text-danger/70 active:text-danger py-2" onClick={handleClear} style={{ minHeight: 44 }}>
                                        Clear
                                    </button>
                                )}
                            </div>
                            <button className="text-sm text-buoy active:text-buoy/80 py-2" onClick={handleGoManual} style={{ minHeight: 44 }}>
                                Manual →
                            </button>
                        </div>
                    </div>
                ) : (
                    /* CONFIRM MODE - enter dimensions */
                    <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-teal" />
                            <span className="text-sm font-medium text-text-primary">All 4 corners marked</span>
                        </div>

                        {/* Shape toggle */}
                        <div className="flex gap-2">
                            {['rectangle', 'square'].map(s => (
                                <button
                                    key={s}
                                    className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${shape === s ? 'bg-teal/15 text-teal border border-teal/30' : 'bg-ocean-800 text-text-secondary border border-border'}`}
                                    onClick={() => setShape(s)}
                                    style={{ minHeight: 44 }}
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
                                    placeholder="e.g. 1000"
                                    className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-3 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50 placeholder:text-text-dim/40"
                                    style={{ minHeight: 48 }}
                                />
                            </div>
                            {shape === 'rectangle' && (
                                <div className="flex-1">
                                    <label className="text-xs text-text-dim mb-1 block">Width (mm)</label>
                                    <input
                                        type="number"
                                        value={editWidth}
                                        onChange={(e) => setEditWidth(e.target.value)}
                                        placeholder="e.g. 500"
                                        className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-3 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50 placeholder:text-text-dim/40"
                                        style={{ minHeight: 48 }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Edge Margin & Kerf */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs text-text-dim mb-1 block">Edge Margin (mm)</label>
                                <input
                                    type="number"
                                    value={edgeMargin}
                                    onChange={(e) => setEdgeMargin(e.target.value)}
                                    className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-2.5 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50"
                                    style={{ minHeight: 44 }}
                                />
                                <p className="text-[10px] text-text-dim mt-0.5">Distance from edge to first cut</p>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-text-dim mb-1 block">Kerf Width (mm)</label>
                                <input
                                    type="number"
                                    value={kerf}
                                    onChange={(e) => setKerf(e.target.value)}
                                    className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-2.5 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50"
                                    style={{ minHeight: 44 }}
                                />
                                <p className="text-[10px] text-text-dim mt-0.5">Blade/laser cut thickness</p>
                            </div>
                        </div>

                        <p className="text-xs text-amber">⚠ Enter the actual measured dimensions above</p>

                        {/* Action buttons */}
                        <div className="flex gap-2 pb-2">
                            <button
                                onClick={handleUndo}
                                className="px-4 py-3 rounded-lg border border-border text-text-secondary text-sm active:text-text-primary"
                                style={{ minHeight: 48 }}
                            >
                                ↩ Back
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!editLength || (shape === 'rectangle' && !editWidth)}
                                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${editLength && (shape !== 'rectangle' || editWidth) ? 'bg-buoy text-white active:bg-buoy/90' : 'bg-steel text-text-dim cursor-not-allowed'}`}
                                style={{ minHeight: 48 }}
                            >
                                Confirm Dimensions →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
