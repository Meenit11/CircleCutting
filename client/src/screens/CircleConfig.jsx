import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import { pageTransition, staggerContainer, staggerItem } from '../animations/animations';
import { optimizeCircles } from '../utils/utils';
import { useState } from 'react';

export default function CircleConfig() {
    const sheet = useStore((s) => s.sheet);
    const circleConfig = useStore((s) => s.circleConfig);
    const setCircleConfig = useStore((s) => s.setCircleConfig);
    const setResults = useStore((s) => s.setResults);
    const setScreen = useStore((s) => s.setScreen);
    const clearSuggestions = useStore((s) => s.clearSuggestions);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const radius = Number(circleConfig.radius) || 0;
    const canOptimize = radius > 0;

    const handleOptimize = async () => {
        if (!canOptimize) return;
        setLoading(true);
        setError(null);
        clearSuggestions();

        try {
            const width = sheet.shape === 'square' ? Number(sheet.length) : Number(sheet.width);
            const params = {
                length: Number(sheet.length),
                width: width,
                radius: radius,
                kerf: sheet.kerf,
                edgeMargin: sheet.edgeMargin,
                packing: circleConfig.packing,
                suggestLeftovers: circleConfig.suggestLeftovers,
                minSuggestRadius: circleConfig.minSuggestRadius,
                exactCount: circleConfig.mode === 'exact' ? Number(circleConfig.exactCount) : null,
            };

            const data = await optimizeCircles(params);
            setResults(data);
            setScreen('results');
        } catch (err) {
            setError(err.message || 'Optimization failed. Check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="min-h-full flex flex-col items-center px-4 py-6"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Back */}
            <div className="w-full max-w-lg mb-4">
                <button
                    onClick={() => setScreen('manualEntry')}
                    className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                    ← Back
                </button>
            </div>

            {/* Locked sheet preview */}
            <motion.div
                className="w-full max-w-lg mb-4"
                initial={{ y: -30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <div className="bracket-card px-4 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-6 border border-teal/40 rounded-sm flex items-center justify-center">
                        <svg width="16" height="12" viewBox="0 0 16 12"><rect x="1" y="1" width="14" height="10" fill="none" stroke="#b0916a" strokeWidth="0.8" rx="0.5" /></svg>
                    </div>
                    <div className="mono-num text-sm text-text-secondary">
                        {sheet.length}
                        {sheet.shape === 'rectangle' ? ` × ${sheet.width}` : ` × ${sheet.length}`}mm
                    </div>
                    <div className="text-xs text-text-dim ml-auto">Sheet locked</div>
                </div>
            </motion.div>

            {/* Config card */}
            <motion.div
                className="bracket-card p-6 w-full max-w-lg"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                <motion.h2 variants={staggerItem} className="text-lg font-semibold text-text-primary mb-6">
                    What circles are you cutting?
                </motion.h2>

                {/* Radius input */}
                <motion.div variants={staggerItem} className="mb-2">
                    <label className="text-xs text-text-dim uppercase tracking-wider mb-1.5 block">Circle Radius (mm)</label>
                    <input
                        type="number"
                        value={circleConfig.radius}
                        onChange={(e) => setCircleConfig({ radius: e.target.value })}
                        placeholder="e.g. 10"
                        className="w-full bg-ocean-800 border border-border rounded-lg px-4 py-4 text-2xl mono-num text-text-primary text-center focus:outline-none focus:border-buoy/50 transition-colors placeholder:text-text-dim/40"
                        min="1"
                    />
                </motion.div>
                {radius > 0 && (
                    <motion.div
                        className="text-center text-sm text-text-secondary mono-num mb-5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        Diameter: {radius * 2}mm
                    </motion.div>
                )}

                {/* Mode toggle */}
                <motion.div variants={staggerItem} className="mb-5">
                    <div className="flex gap-2">
                        <button
                            className={`flex-1 py-2 rounded text-sm transition-all ${circleConfig.mode === 'maximize'
                                ? 'bg-buoy/15 text-buoy border border-buoy/30'
                                : 'bg-ocean-800 text-text-secondary border border-border hover:border-border-bright'
                                }`}
                            onClick={() => setCircleConfig({ mode: 'maximize' })}
                        >
                            Maximize count
                        </button>
                        <button
                            className={`flex-1 py-2 rounded text-sm transition-all ${circleConfig.mode === 'exact'
                                ? 'bg-buoy/15 text-buoy border border-buoy/30'
                                : 'bg-ocean-800 text-text-secondary border border-border hover:border-border-bright'
                                }`}
                            onClick={() => setCircleConfig({ mode: 'exact' })}
                        >
                            Exact count
                        </button>
                    </div>
                    {circleConfig.mode === 'exact' && (
                        <motion.input
                            type="number"
                            value={circleConfig.exactCount}
                            onChange={(e) => setCircleConfig({ exactCount: e.target.value })}
                            placeholder="How many circles?"
                            className="w-full mt-2 bg-ocean-800 border border-border rounded-lg px-3 py-2.5 text-sm mono-num text-text-primary focus:outline-none focus:border-buoy/50 placeholder:text-text-dim/40"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            min="1"
                        />
                    )}
                </motion.div>

                {/* Leftover toggle */}
                <motion.div variants={staggerItem} className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-text-primary">Suggest circles for leftover zones</span>
                        <button
                            className={`w-11 h-6 rounded-full transition-colors relative ${circleConfig.suggestLeftovers ? 'bg-seafoam' : 'bg-steel'
                                }`}
                            onClick={() => setCircleConfig({ suggestLeftovers: !circleConfig.suggestLeftovers })}
                        >
                            <motion.div
                                className="w-5 h-5 rounded-full bg-white absolute top-0.5"
                                animate={{ left: circleConfig.suggestLeftovers ? 22 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </button>
                    </div>
                    {circleConfig.suggestLeftovers && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mt-2"
                        >
                            <label className="text-xs text-text-dim mb-1 block">Minimum radius to suggest (mm)</label>
                            <input
                                type="number"
                                value={circleConfig.minSuggestRadius}
                                onChange={(e) => setCircleConfig({ minSuggestRadius: Number(e.target.value) })}
                                className="w-full bg-ocean-800 border border-border rounded px-3 py-2 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50"
                                min="1"
                            />
                            <p className="text-xs text-text-dim mt-1">After placing primary circles, we'll suggest what else can be cut from the waste</p>
                        </motion.div>
                    )}
                </motion.div>

                {/* Packing pattern */}
                <motion.div variants={staggerItem} className="mb-6">
                    <details className="group">
                        <summary className="text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors flex items-center gap-1">
                            <span>⚙ Advanced — Packing Pattern</span>
                        </summary>
                        <div className="mt-3 space-y-2">
                            <label className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all ${circleConfig.packing === 'hex' ? 'bg-teal/10 border border-teal/30' : 'bg-ocean-800 border border-border'
                                }`}>
                                <input
                                    type="radio"
                                    name="packing"
                                    checked={circleConfig.packing === 'hex'}
                                    onChange={() => setCircleConfig({ packing: 'hex' })}
                                    className="accent-teal"
                                />
                                <div>
                                    <div className="text-sm text-text-primary flex items-center gap-2">
                                        ⬡ Hex Packing
                                        <span className="text-xs bg-seafoam/15 text-seafoam px-1.5 py-0.5 rounded">Recommended</span>
                                    </div>
                                    <p className="text-xs text-text-dim mt-0.5">Offset rows — fits ~15% more circles on average</p>
                                </div>
                            </label>
                            <label className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all ${circleConfig.packing === 'grid' ? 'bg-teal/10 border border-teal/30' : 'bg-ocean-800 border border-border'
                                }`}>
                                <input
                                    type="radio"
                                    name="packing"
                                    checked={circleConfig.packing === 'grid'}
                                    onChange={() => setCircleConfig({ packing: 'grid' })}
                                    className="accent-teal"
                                />
                                <div>
                                    <div className="text-sm text-text-primary">⬜ Grid Packing</div>
                                    <p className="text-xs text-text-dim mt-0.5">Aligned rows and columns — simpler pattern</p>
                                </div>
                            </label>
                        </div>
                    </details>
                </motion.div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 rounded bg-danger/10 border border-danger/30 text-sm text-danger">
                        {error}
                    </div>
                )}

                {/* CTA */}
                <motion.button
                    variants={staggerItem}
                    onClick={handleOptimize}
                    disabled={!canOptimize || loading}
                    className={`w-full py-4 rounded-lg font-bold text-base transition-all ${canOptimize && !loading
                        ? 'bg-buoy text-white hover:bg-buoy/90 hover:shadow-lg hover:shadow-buoy/25'
                        : 'bg-steel text-text-dim cursor-not-allowed'
                        }`}
                    whileHover={canOptimize && !loading ? { y: -1 } : {}}
                    whileTap={canOptimize && !loading ? { scale: 0.98 } : {}}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <motion.span
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            />
                            Optimizing...
                        </span>
                    ) : (
                        'Optimize Cut →'
                    )}
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
