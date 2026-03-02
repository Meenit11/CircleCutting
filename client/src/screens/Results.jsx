import { motion, useDragControls, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/store';
import { pageTransition } from '../animations/animations';
import SheetDiagram from '../components/SheetDiagram';
import EfficiencyRing from '../components/EfficiencyRing';
import MonoNumber from '../components/MonoNumber';
import LeftoverZoneCard from '../components/LeftoverZoneCard';
import { formatArea } from '../utils/utils';
import { useState, useRef, useMemo, useCallback } from 'react';
import { toPng } from 'html-to-image';

export default function Results() {
    const results = useStore((s) => s.results);
    const selectedSuggestions = useStore((s) => s.selectedSuggestions);
    const setScreen = useStore((s) => s.setScreen);
    const saveJob = useStore((s) => s.saveJob);
    const sheet = useStore((s) => s.sheet);
    const circleConfig = useStore((s) => s.circleConfig);
    const [saved, setSaved] = useState(false);
    const [exported, setExported] = useState(false);
    const exportRef = useRef(null);

    // Mobile drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);

    if (!results) return null;

    const { stats, circles, leftoverZones } = results;

    // Compute totals including selected suggestions
    const { totalCircles, totalArea, efficiency, extraCount, extraArea, recoveredArea } = useMemo(() => {
        let extra = 0;
        let eArea = 0;
        if (leftoverZones) {
            for (const zone of leftoverZones) {
                const selIdx = selectedSuggestions[zone.id];
                if (selIdx !== undefined && zone.suggestions[selIdx]) {
                    extra += zone.suggestions[selIdx].count;
                    eArea += zone.suggestions[selIdx].area;
                }
            }
        }
        const tCircles = stats.count + extra;
        const tArea = stats.circleArea + eArea;
        const eff = (tArea / stats.totalArea) * 100;
        return {
            totalCircles: tCircles,
            totalArea: tArea,
            efficiency: eff,
            extraCount: extra,
            extraArea: eArea,
            recoveredArea: eArea,
        };
    }, [stats, leftoverZones, selectedSuggestions]);

    const handleSave = () => {
        saveJob();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleExport = async () => {
        if (!exportRef.current) return;
        try {
            const dataUrl = await toPng(exportRef.current, {
                backgroundColor: '#060d18',
                pixelRatio: 2,
            });
            const link = document.createElement('a');
            link.download = `circle-cutting-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            setExported(true);
            setTimeout(() => setExported(false), 2000);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const dataPanel = (
        <div className="space-y-5">
            {/* Efficiency Ring */}
            <div className="flex flex-col items-center gap-2">
                <EfficiencyRing percentage={efficiency} size={140} strokeWidth={10} />
                <p className="text-xs text-text-dim text-center max-w-[260px] leading-relaxed">
                    Circles leave gaps between them — max possible is ~90%. Above 70% is excellent.
                </p>
            </div>

            {/* Primary Result */}
            <div className="bracket-card p-4">
                <div className="text-3xl font-bold text-text-primary mono-num mb-1">
                    <MonoNumber value={totalCircles} duration={800} /> <span className="text-lg font-normal text-text-secondary">circles</span>
                </div>
                <div className="text-sm text-text-secondary">
                    Radius <span className="mono-num">{stats.radius}mm</span> • {stats.packing === 'hex' ? 'Hex' : 'Grid'} packed
                </div>
                <div className="text-xs text-text-dim mt-1 mono-num">
                    Material used: <MonoNumber value={totalArea} duration={600} decimals={0} /> of {formatArea(stats.totalArea)}
                </div>
            </div>

            {/* Leftover Zones */}
            {leftoverZones && leftoverZones.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber pulse-glow" />
                        Leftover Zones
                    </h3>
                    <div className="space-y-3">
                        {leftoverZones.map(zone => (
                            <LeftoverZoneCard key={zone.id} zone={zone} />
                        ))}
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="bracket-card p-4 space-y-2">
                <h3 className="text-sm font-medium text-text-primary mb-2">Summary</h3>
                <div className="text-sm text-text-secondary">
                    <span className="mono-num">{stats.count} × r{stats.radius}mm</span>
                    {extraCount > 0 && (
                        <>
                            {leftoverZones && leftoverZones.map(zone => {
                                const selIdx = selectedSuggestions[zone.id];
                                if (selIdx === undefined || !zone.suggestions[selIdx]) return null;
                                const sug = zone.suggestions[selIdx];
                                return (
                                    <span key={zone.id} className="text-seafoam"> + {sug.count} × r{sug.radius}mm</span>
                                );
                            })}
                            <span className="text-text-primary font-medium"> = {totalCircles} total</span>
                        </>
                    )}
                </div>
                <div className="text-sm mono-num">
                    Efficiency: <span className="text-seafoam"><MonoNumber value={efficiency} decimals={1} suffix="%" /></span>
                </div>
                <div className="text-sm text-text-dim mono-num">
                    Waste: {formatArea(stats.totalArea - totalArea)}
                </div>
                {recoveredArea > 0 && (
                    <motion.div
                        className="text-xs text-seafoam bg-seafoam/10 rounded px-2 py-1.5 mt-2"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        ✨ By using leftover zones, you recovered {formatArea(recoveredArea)} of material
                    </motion.div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => setScreen('circleConfig')}
                    className="flex-1 py-2.5 rounded-lg bg-ocean-800 border border-border text-sm text-text-secondary hover:text-text-primary hover:border-border-bright transition-all"
                >
                    🔄 Recalculate
                </button>
                <button
                    onClick={handleExport}
                    className="flex-1 py-2.5 rounded-lg bg-ocean-800 border border-border text-sm text-text-secondary hover:text-text-primary hover:border-border-bright transition-all"
                >
                    {exported ? (
                        <span className="text-seafoam">✓ Exported</span>
                    ) : '📤 Export'}
                </button>
                <button
                    onClick={handleSave}
                    className="flex-1 py-2.5 rounded-lg bg-ocean-800 border border-border text-sm text-text-secondary hover:text-text-primary hover:border-border-bright transition-all"
                >
                    {saved ? (
                        <span className="text-seafoam">✓ Saved</span>
                    ) : '💾 Save'}
                </button>
            </div>

            {/* Home button */}
            <button
                onClick={() => setScreen('home')}
                className="w-full py-2 text-sm text-text-dim hover:text-text-secondary transition-colors"
            >
                ← Back to Home
            </button>
        </div>
    );

    return (
        <motion.div
            className="min-h-full"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Desktop Layout */}
            <div className="hidden md:flex h-screen" ref={exportRef}>
                {/* Left — Diagram */}
                <div className="flex-1 p-6 flex items-center justify-center bg-ocean-950">
                    <SheetDiagram width={600} height={500} />
                </div>
                {/* Right — Data */}
                <div className="w-[420px] p-6 overflow-y-auto bg-gunmetal border-l border-border">
                    {dataPanel}
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden flex flex-col h-screen relative">
                {/* Diagram takes full width */}
                <div className="flex-1 relative" ref={exportRef}>
                    <SheetDiagram width={390} height={320} />
                </div>

                {/* Bottom Drawer */}
                <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-gunmetal/98 backdrop-blur-md border-t border-border rounded-t-2xl z-20 overflow-hidden"
                    initial={{ height: '40vh' }}
                    animate={{ height: drawerOpen ? '90vh' : '40vh' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                >
                    {/* Drag handle */}
                    <div
                        className="flex justify-center py-3 cursor-grab"
                        onClick={() => setDrawerOpen(!drawerOpen)}
                    >
                        <div className="w-10 h-1 rounded-full bg-steel" />
                    </div>

                    {/* Scrollable content */}
                    <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: drawerOpen ? 'calc(90vh - 40px)' : 'calc(40vh - 40px)' }}>
                        {dataPanel}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
