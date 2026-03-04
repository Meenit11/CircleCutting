import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import Logo from '../components/Logo';
import { pageTransition, staggerContainer, staggerItem, cardHover } from '../animations/animations';
import { formatDate } from '../utils/utils';

export default function Home() {
    const setScreen = useStore((s) => s.setScreen);
    const recentJobs = useStore((s) => s.recentJobs);
    const loadJob = useStore((s) => s.loadJob);

    return (
        <motion.div
            className="min-h-full flex flex-col items-center justify-center px-4 py-8"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Logo */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="mb-10"
            >
                <Logo size="large" />
            </motion.div>

            {/* Action Cards */}
            <motion.div
                className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mb-10"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                {/* Scan Sheet */}
                <motion.button
                    variants={staggerItem}
                    className="bracket-card flex-1 p-6 text-left group cursor-pointer"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setScreen('arScan')}
                    style={{ boxShadow: '0 0 0 rgba(63, 184, 160, 0)' }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(63, 184, 160, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 rgba(63, 184, 160, 0)'}
                >
                    <div className="w-12 h-12 rounded-lg bg-ocean-700 flex items-center justify-center mb-4 group-hover:bg-ocean-600 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3fb8a0" strokeWidth="1.5">
                            <path d="M2 7V2h5M17 2h5v5M22 17v5h-5M7 22H2v-5" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 5v2M12 17v2M5 12h2M17 12h2" opacity="0.5" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">Scan Sheet</h3>
                    <p className="text-sm text-text-secondary">No tape measure? Use your camera for an estimate</p>
                </motion.button>

                {/* Enter Dimensions */}
                <motion.button
                    variants={staggerItem}
                    className="bracket-card flex-1 p-6 text-left group cursor-pointer"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setScreen('manualEntry')}
                    style={{ boxShadow: '0 0 0 rgba(224, 90, 48, 0)' }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(224, 90, 48, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 rgba(224, 90, 48, 0)'}
                >
                    <div className="w-12 h-12 rounded-lg bg-ocean-700 flex items-center justify-center mb-4 group-hover:bg-ocean-600 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e05a30" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="1" />
                            <path d="M3 8h3M3 12h2M3 16h3M3 20h2" opacity="0.5" />
                            <path d="M8 3v3M12 3v2M16 3v3M20 3v2" opacity="0.5" />
                            <path d="M8 8l8 8M16 8l-8 8" opacity="0.3" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">Enter Dimensions</h3>
                    <p className="text-sm text-text-secondary">Know your sheet size? Enter it directly</p>
                </motion.button>
            </motion.div>

            {/* Recent Jobs */}
            <motion.div
                className="w-full max-w-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <h3 className="text-xs text-text-dim uppercase tracking-wider mb-3 px-1">Recent Jobs</h3>

                {recentJobs.length === 0 ? (
                    <div className="text-center py-6 text-text-dim text-sm border border-border/50 rounded-lg border-dashed">
                        Your recent cuts will appear here
                    </div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                        {recentJobs.map((job) => (
                            <motion.button
                                key={job.id}
                                className="bracket-card flex-shrink-0 p-3 min-w-[160px] text-left cursor-pointer"
                                whileHover={{ scale: 1.03, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => loadJob(job)}
                            >
                                <div className="mono-num text-sm text-text-primary mb-1">
                                    {job.length}×{job.width}mm
                                </div>
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    <span className="mono-num">r{job.radius}mm</span>
                                    <span>•</span>
                                    <span className="mono-num">{job.totalCircles} cuts</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="mono-num text-xs text-seafoam">{job.efficiency}%</span>
                                    <span className="text-xs text-text-dim">{formatDate(job.timestamp)}</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Footer */}
            <motion.div
                className="mt-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <div className="h-px bg-border w-48 mx-auto mb-3" />
                <p className="text-xs text-text-dim">Works on iOS and Android • AR requires camera permission</p>
            </motion.div>
        </motion.div>
    );
}
