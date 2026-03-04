import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import { pageTransition, staggerContainer, staggerItem } from '../animations/animations';


export default function ManualEntry() {
    const sheet = useStore((s) => s.sheet);
    const setSheet = useStore((s) => s.setSheet);
    const setScreen = useStore((s) => s.setScreen);


    const length = Number(sheet.length) || 0;
    const width = sheet.shape === 'square' ? length : Number(sheet.width) || 0;

    const canSubmit = length > 0 && width > 0;

    // Scale preview
    const maxPreview = 200;
    const previewScale = length > 0 && width > 0
        ? Math.min(maxPreview / Math.max(length, width), 1)
        : 0;

    const handleSubmit = () => {
        if (!canSubmit) return;
        if (sheet.shape === 'square') {
            setSheet({ width: sheet.length });
        }
        setScreen('circleConfig');
    };

    return (
        <motion.div
            className="min-h-full flex flex-col items-center px-4 py-6"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Back button */}
            <div className="w-full max-w-lg mb-6">
                <button
                    onClick={() => setScreen('home')}
                    className="text-text-secondary hover:text-text-primary transition-colors text-sm flex items-center gap-1"
                >
                    ← Back
                </button>
            </div>

            <motion.div
                className="bracket-card p-6 w-full max-w-lg"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                {/* Header */}
                <motion.div variants={staggerItem} className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-ocean-700 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#3fb8a0" strokeWidth="1.2">
                            <rect x="2" y="4" width="16" height="12" rx="1" />
                            <path d="M2 8h2M2 12h2" opacity="0.5" />
                            <path d="M6 4v2M10 4v2M14 4v2" opacity="0.5" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-primary">Sheet Dimensions</h2>
                        <p className="text-xs text-text-secondary">Enter your sheet metal measurements</p>
                    </div>
                </motion.div>

                {/* Shape toggle */}
                <motion.div variants={staggerItem} className="flex gap-2 mb-5">
                    {['rectangle', 'square'].map(s => (
                        <button
                            key={s}
                            className={`flex-1 py-2 rounded text-sm capitalize font-medium transition-all ${sheet.shape === s
                                ? 'bg-teal/15 text-teal border border-teal/30'
                                : 'bg-ocean-800 text-text-secondary border border-border hover:border-border-bright'
                                }`}
                            onClick={() => setSheet({ shape: s })}
                        >
                            {s}
                        </button>
                    ))}
                </motion.div>

                {/* Dimension inputs */}
                <motion.div variants={staggerItem} className="flex gap-3 mb-4">
                    <div className="flex-1">
                        <label className="text-xs text-text-dim mb-1.5 block uppercase tracking-wider">
                            {sheet.shape === 'square' ? 'Side Length' : 'Length'} (mm)
                        </label>
                        <input
                            type="number"
                            value={sheet.length}
                            onChange={(e) => setSheet({ length: e.target.value })}
                            placeholder="e.g. 1000"
                            className="w-full bg-ocean-800 border border-border rounded-lg px-4 py-3 text-lg mono-num text-text-primary focus:outline-none focus:border-teal/50 transition-colors placeholder:text-text-dim/50"
                            min="1"
                        />
                    </div>
                    {sheet.shape === 'rectangle' && (
                        <div className="flex-1">
                            <label className="text-xs text-text-dim mb-1.5 block uppercase tracking-wider">Width (mm)</label>
                            <input
                                type="number"
                                value={sheet.width}
                                onChange={(e) => setSheet({ width: e.target.value })}
                                placeholder="e.g. 500"
                                className="w-full bg-ocean-800 border border-border rounded-lg px-4 py-3 text-lg mono-num text-text-primary focus:outline-none focus:border-teal/50 transition-colors placeholder:text-text-dim/50"
                                min="1"
                            />
                        </div>
                    )}
                </motion.div>

                {/* Edge Margin & Kerf */}
                <motion.div variants={staggerItem} className="flex gap-3 mb-6">
                    <div className="flex-1">
                        <label className="text-xs text-text-dim uppercase tracking-wider mb-1.5 block">Edge Margin (mm)</label>
                        <input
                            type="number"
                            value={sheet.edgeMargin}
                            onChange={(e) => setSheet({ edgeMargin: Number(e.target.value) })}
                            className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-2.5 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50 transition-colors"
                            min="0"
                        />
                        <p className="text-xs text-text-dim mt-1.5">How far from the sheet edge to keep cuts — avoids damage near borders</p>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-text-dim uppercase tracking-wider mb-1.5 block">Kerf Width (mm)</label>
                        <input
                            type="number"
                            value={sheet.kerf}
                            onChange={(e) => setSheet({ kerf: Number(e.target.value) })}
                            className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-2.5 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50 transition-colors"
                            min="0"
                            step="0.5"
                        />
                        <p className="text-xs text-text-dim mt-1.5">Thickness of your blade/laser cut — material destroyed during cutting</p>
                    </div>
                </motion.div>

                {/* Live Preview */}
                <motion.div variants={staggerItem} className="mb-6">
                    <div className="bg-ocean-900/50 rounded-lg p-4 flex items-center justify-center" style={{ minHeight: 160 }}>
                        {length > 0 && width > 0 ? (
                            <motion.div className="relative" layout>
                                <motion.svg
                                    width={Math.max(40, length * previewScale)}
                                    height={Math.max(30, width * previewScale)}
                                    animate={{ width: Math.max(40, length * previewScale), height: Math.max(30, width * previewScale) }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                >
                                    <rect
                                        x={1} y={1}
                                        width={Math.max(38, length * previewScale - 2)}
                                        height={Math.max(28, width * previewScale - 2)}
                                        fill="rgba(18, 30, 42, 0.5)"
                                        stroke="#3fb8a0"
                                        strokeWidth={1.5}
                                        rx={2}
                                    />
                                    {/* Corner brackets */}
                                    <path d="M 1,8 L 1,1 L 8,1" fill="none" stroke="#3fb8a0" strokeWidth={1.5} opacity={0.6} />
                                    {/* Dimension on top */}
                                    <text
                                        x={Math.max(20, (length * previewScale) / 2)}
                                        y={-4}
                                        textAnchor="middle"
                                        fill="#94a3b8"
                                        fontSize={10}
                                        fontFamily="'JetBrains Mono', monospace"
                                    >
                                        {length}mm
                                    </text>
                                    {/* Dimension on side */}
                                    <text
                                        x={-4}
                                        y={Math.max(15, (width * previewScale) / 2)}
                                        textAnchor="middle"
                                        fill="#94a3b8"
                                        fontSize={10}
                                        fontFamily="'JetBrains Mono', monospace"
                                        transform={`rotate(-90, -4, ${Math.max(15, (width * previewScale) / 2)})`}
                                    >
                                        {width}mm
                                    </text>
                                </motion.svg>
                            </motion.div>
                        ) : (
                            <p className="text-sm text-text-dim">Enter dimensions to see preview</p>
                        )}
                    </div>
                </motion.div>

                {/* CTA */}
                <motion.button
                    variants={staggerItem}
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`w-full py-3.5 rounded-lg font-semibold text-sm transition-all ${canSubmit
                        ? 'bg-buoy text-white hover:bg-buoy/90 hover:shadow-lg hover:shadow-buoy/20'
                        : 'bg-steel text-text-dim cursor-not-allowed'
                        }`}
                    whileHover={canSubmit ? { y: -1 } : {}}
                    whileTap={canSubmit ? { scale: 0.98 } : {}}
                >
                    Set Sheet → Continue to Circles
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
