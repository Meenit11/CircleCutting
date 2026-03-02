import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import { useState } from 'react';
import { optimizeCircles } from '../utils/utils';

export default function LeftoverZoneCard({ zone }) {
    const selectedSuggestions = useStore((s) => s.selectedSuggestions);
    const selectSuggestion = useStore((s) => s.selectSuggestion);
    const results = useStore((s) => s.results);
    const sheet = useStore((s) => s.sheet);
    const selected = selectedSuggestions[zone.id];

    const [showManual, setShowManual] = useState(false);
    const [customRadius, setCustomRadius] = useState('');
    const [customResult, setCustomResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Create index for manual suggestion (after the auto suggestions)
    const manualIndex = zone.suggestions.length;

    const handleCustomOptimize = async () => {
        const r = Number(customRadius);
        if (r <= 0 || !zone.width || !zone.height) return;
        setLoading(true);
        try {
            // Quick local calculation: how many circles of this radius fit in the zone
            const kerf = results?.stats?.kerf || 2;
            const effectiveR = r + kerf / 2;
            const diameter = effectiveR * 2;
            const rowHeight = effectiveR * Math.sqrt(3);

            const circles = [];
            let row = 0;
            let y = effectiveR;
            while (y <= zone.height - effectiveR) {
                const isOffset = row % 2 === 1;
                const xOff = isOffset ? effectiveR : 0;
                let x = effectiveR + xOff;
                while (x <= zone.width - effectiveR) {
                    circles.push({
                        x: Math.round((x + zone.x) * 100) / 100,
                        y: Math.round((y + zone.y) * 100) / 100,
                        r: r,
                    });
                    x += diameter;
                }
                y += rowHeight;
                row++;
            }

            if (circles.length > 0) {
                const sug = {
                    radius: r,
                    count: circles.length,
                    circles: circles,
                    area: Math.round(circles.length * Math.PI * r * r * 100) / 100,
                    isCustom: true,
                };
                setCustomResult(sug);

                // Add the custom suggestion to the zone's suggestions array if not already there
                // We'll store it at manualIndex
                if (!zone.suggestions[manualIndex] || zone.suggestions[manualIndex].radius !== r) {
                    zone.suggestions[manualIndex] = sug;
                }
                selectSuggestion(zone.id, manualIndex);
            } else {
                setCustomResult({ count: 0 });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!zone.suggestions || zone.suggestions.length === 0) return null;

    return (
        <motion.div
            className="bracket-card p-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber pulse-glow" />
                <h4 className="text-sm font-medium text-text-primary">{zone.label}</h4>
                <span className="text-xs text-text-dim mono-num ml-auto">
                    {zone.width.toFixed(0)}×{zone.height.toFixed(0)}mm
                </span>
            </div>

            {/* Auto suggestions */}
            <div className="space-y-2 mb-3">
                <p className="text-xs text-text-dim uppercase tracking-wider">Suggested</p>
                {zone.suggestions.slice(0, manualIndex).map((sug, i) => {
                    const isSelected = selected === i;
                    return (
                        <motion.button
                            key={i}
                            onClick={() => selectSuggestion(zone.id, i)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left text-sm transition-all ${isSelected
                                    ? 'bg-seafoam/15 border border-seafoam/40 text-seafoam'
                                    : 'bg-ocean-800/50 border border-border hover:border-border-bright text-text-secondary hover:text-text-primary'
                                }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            <span className="mono-num">
                                {sug.count} circles × r{sug.radius}mm
                            </span>
                            <span className={`text-xs ${isSelected ? 'text-seafoam/80' : 'text-text-dim'}`}>
                                {isSelected ? '✓ Active' : 'Tap to add'}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Manual custom radius */}
            <div className="border-t border-border pt-3">
                <button
                    onClick={() => setShowManual(!showManual)}
                    className="text-xs text-teal hover:text-teal/80 transition-colors flex items-center gap-1 mb-2"
                >
                    {showManual ? '▾' : '▸'} Custom radius
                </button>

                {showManual && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-2"
                    >
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={customRadius}
                                onChange={(e) => setCustomRadius(e.target.value)}
                                placeholder="Radius (mm)"
                                className="flex-1 bg-ocean-800 border border-border rounded px-3 py-2 text-sm mono-num text-text-primary focus:outline-none focus:border-teal/50 placeholder:text-text-dim/40"
                                min="1"
                            />
                            <button
                                onClick={handleCustomOptimize}
                                disabled={!customRadius || Number(customRadius) <= 0 || loading}
                                className={`px-4 py-2 rounded text-sm font-medium transition-all ${customRadius && Number(customRadius) > 0
                                        ? 'bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25'
                                        : 'bg-steel text-text-dim cursor-not-allowed border border-border'
                                    }`}
                            >
                                {loading ? '...' : 'Fit'}
                            </button>
                        </div>

                        {customResult && customResult.count === 0 && (
                            <p className="text-xs text-amber">No circles of that size fit in this zone</p>
                        )}

                        {customResult && customResult.count > 0 && (
                            <motion.button
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => {
                                    if (!zone.suggestions[manualIndex] || zone.suggestions[manualIndex].radius !== customResult.radius) {
                                        zone.suggestions[manualIndex] = customResult;
                                    }
                                    selectSuggestion(zone.id, manualIndex);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left text-sm transition-all ${selected === manualIndex
                                        ? 'bg-teal/15 border border-teal/40 text-teal'
                                        : 'bg-ocean-800/50 border border-border hover:border-border-bright text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                <span className="mono-num">
                                    {customResult.count} circles × r{customResult.radius}mm
                                </span>
                                <span className={`text-xs ${selected === manualIndex ? 'text-teal/80' : 'text-text-dim'}`}>
                                    {selected === manualIndex ? '✓ Active' : 'Tap to add'}
                                </span>
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
