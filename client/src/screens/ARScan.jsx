import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { pageTransition } from '../animations/animations';

export default function ARScan() {
    const setScreen = useStore((s) => s.setScreen);
    const setSheet = useStore((s) => s.setSheet);
    const [corners, setCorners] = useState([]);
    const [showInstructions, setShowInstructions] = useState(true);
    const [detectedDims, setDetectedDims] = useState(null);
    const [editLength, setEditLength] = useState('');
    const [editWidth, setEditWidth] = useState('');
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
                        facingMode: { ideal: 'environment' }, // prefer back camera
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

        // Cleanup: stop camera when leaving
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setShowInstructions(false), 4000);
        return () => clearTimeout(t);
    }, []);

    const handleTap = (e) => {
        if (corners.length >= 4) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newCorners = [...corners, { x, y }];
        setCorners(newCorners);

        if (newCorners.length === 4) {
            // Estimate dimensions from pixel distance between corners
            // This is a rough estimate — corners represent sheet edges
            const dx1 = Math.abs(newCorners[1].x - newCorners[0].x);
            const dy1 = Math.abs(newCorners[1].y - newCorners[0].y);
            const dx2 = Math.abs(newCorners[3].x - newCorners[0].x);
            const dy2 = Math.abs(newCorners[3].y - newCorners[0].y);
            const len = Math.round(Math.sqrt(dx1 * dx1 + dy1 * dy1) * 2.5);
            const wid = Math.round(Math.sqrt(dx2 * dx2 + dy2 * dy2) * 2.5);
            setDetectedDims({ length: len, width: wid });
            setEditLength(len.toString());
            setEditWidth(wid.toString());
        }
    };

    const handleConfirm = () => {
        const l = Number(editLength);
        const w = shape === 'square' ? l : Number(editWidth);
        if (l > 0 && w > 0) {
            setSheet({ length: l.toString(), width: w.toString(), shape });
            setScreen('circleConfig');
        }
    };

    const handleGoManual = () => {
        // Stop camera before navigating
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setScreen('manualEntry');
    };

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
                <h2 className="text-sm font-medium text-text-primary">AR Scan</h2>
                <div className="flex items-center gap-1 bg-amber/15 text-amber text-xs px-2 py-1 rounded">
                    ⚠️ Estimate
                </div>
            </div>

            {/* Camera area */}
            <div
                className="flex-1 relative bg-ocean-950 cursor-crosshair overflow-hidden"
                onClick={handleTap}
            >
                {/* Live camera feed */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: 'scaleX(1)' }}
                />

                {/* Dark overlay if no camera */}
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

                {/* Semi-transparent overlay for better UI visibility */}
                {cameraReady && (
                    <div className="absolute inset-0 bg-ocean-950/20 pointer-events-none" />
                )}

                {/* Grid overlay */}
                <div className="absolute inset-0 blueprint-bg opacity-20 pointer-events-none" />

                {/* Scan line animation */}
                {cameraReady && corners.length < 4 && (
                    <motion.div
                        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent opacity-40 pointer-events-none"
                        animate={{ top: ['10%', '90%', '10%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                )}

                {/* Instructions */}
                {showInstructions && corners.length === 0 && (
                    <motion.div
                        className="absolute inset-x-0 top-1/4 flex justify-center pointer-events-none z-10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="bg-gunmetal/90 backdrop-blur-sm rounded-lg px-6 py-4 max-w-xs text-center border border-border pointer-events-auto"
                            onClick={(e) => { e.stopPropagation(); setShowInstructions(false); }}>
                            <p className="text-sm text-text-primary mb-1">Point camera at your sheet on a flat surface</p>
                            <p className="text-xs text-text-secondary">Tap each corner of the sheet to measure</p>
                        </div>
                    </motion.div>
                )}

                {/* Placed corners with brackets */}
                {corners.map((c, i) => (
                    <motion.div
                        key={i}
                        className="absolute pointer-events-none"
                        style={{ left: c.x - 14, top: c.y - 14 }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28">
                            <path d="M2,9 L2,2 L9,2" fill="none" stroke="#b0916a" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M19,2 L26,2 L26,9" fill="none" stroke="#b0916a" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
                            <path d="M26,19 L26,26 L19,26" fill="none" stroke="#b0916a" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
                            <path d="M9,26 L2,26 L2,19" fill="none" stroke="#b0916a" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
                            <circle cx="14" cy="14" r="2.5" fill="#b0916a" />
                        </svg>
                        {/* Ring pulse */}
                        <motion.div
                            className="absolute rounded-full border-2 border-teal pointer-events-none"
                            style={{ top: 3, left: 3, width: 22, height: 22 }}
                            initial={{ scale: 1, opacity: 0.7 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            transition={{ duration: 0.8 }}
                        />
                        {/* Corner label */}
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs mono-num text-teal bg-gunmetal/80 px-1.5 py-0.5 rounded">
                            {i + 1}
                        </span>
                    </motion.div>
                ))}

                {/* Lines between corners */}
                {corners.length >= 2 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {corners.map((c, i) => {
                            if (i === 0) return null;
                            const prev = corners[i - 1];
                            return (
                                <motion.line
                                    key={i}
                                    x1={prev.x} y1={prev.y}
                                    x2={c.x} y2={c.y}
                                    stroke="#b0916a"
                                    strokeWidth="2"
                                    strokeDasharray="6 3"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 0.9 }}
                                    transition={{ duration: 0.4 }}
                                />
                            );
                        })}
                        {corners.length === 4 && (
                            <motion.line
                                x1={corners[3].x} y1={corners[3].y}
                                x2={corners[0].x} y2={corners[0].y}
                                stroke="#b0916a"
                                strokeWidth="2"
                                strokeDasharray="6 3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.9 }}
                                transition={{ duration: 0.4, delay: 0.15 }}
                            />
                        )}
                        {/* Dimension labels on lines */}
                        {corners.length === 4 && detectedDims && (
                            <>
                                <text
                                    x={(corners[0].x + corners[1].x) / 2}
                                    y={(corners[0].y + corners[1].y) / 2 - 10}
                                    textAnchor="middle"
                                    fill="#b0916a"
                                    fontSize="12"
                                    fontFamily="'JetBrains Mono', monospace"
                                    className="drop-shadow-lg"
                                >
                                    ~{detectedDims.length}mm
                                </text>
                                <text
                                    x={(corners[0].x + corners[3].x) / 2 - 10}
                                    y={(corners[0].y + corners[3].y) / 2}
                                    textAnchor="end"
                                    fill="#b0916a"
                                    fontSize="12"
                                    fontFamily="'JetBrains Mono', monospace"
                                    className="drop-shadow-lg"
                                >
                                    ~{detectedDims.width}mm
                                </text>
                            </>
                        )}
                    </svg>
                )}
            </div>

            {/* Bottom panel */}
            <motion.div
                className="bg-gunmetal/95 backdrop-blur-md border-t border-border px-4 py-4 flex-shrink-0 z-20"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {corners.length < 4 ? (
                    <div className="text-center">
                        <div className="mono-num text-lg text-teal mb-1">
                            Tap corner {corners.length + 1} of 4
                        </div>
                        <div className="flex justify-center gap-2 mt-2">
                            {[0, 1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full transition-all ${i < corners.length ? 'bg-teal scale-110' : 'bg-steel'
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-3">
                            {corners.length > 0 && (
                                <button
                                    className="text-xs text-text-dim hover:text-text-secondary transition-colors"
                                    onClick={(e) => { e.stopPropagation(); setCorners([]); }}
                                >
                                    Reset corners
                                </button>
                            )}
                            <button
                                className="text-xs text-buoy hover:text-buoy/80 transition-colors"
                                onClick={handleGoManual}
                            >
                                Enter manually instead →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Shape selector */}
                        <div className="flex gap-2">
                            {['rectangle', 'square'].map(s => (
                                <button
                                    key={s}
                                    className={`flex-1 py-1.5 rounded text-sm capitalize transition-all ${shape === s ? 'bg-teal/15 text-teal border border-teal/30' : 'bg-ocean-800 text-text-secondary border border-border'
                                        }`}
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

                        <div className="flex items-center gap-1 text-xs text-amber">
                            ⚠️ Camera estimates are rough. Adjust dimensions above if needed.
                        </div>

                        <button
                            onClick={handleConfirm}
                            className="w-full py-3 rounded-lg bg-buoy text-white font-semibold text-sm hover:bg-buoy/90 transition-colors"
                        >
                            Confirm Dimensions →
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
