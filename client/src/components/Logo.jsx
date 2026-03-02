import { motion } from 'framer-motion';

export default function Logo({ size = 'large' }) {
    const isLarge = size === 'large';

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Icon: circle being cut from rectangle */}
            <div className="relative" style={{ width: isLarge ? 64 : 36, height: isLarge ? 64 : 36 }}>
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {/* Sheet rectangle */}
                    <rect x="8" y="14" width="48" height="36" rx="2" stroke="#b0916a" strokeWidth="1.5" fill="none" opacity="0.5" />
                    {/* Cut circle */}
                    <circle cx="32" cy="32" r="14" stroke="#e8723a" strokeWidth="2" fill="none" />
                    {/* Dashed cut lines */}
                    <line x1="32" y1="14" x2="32" y2="18" stroke="#b0916a" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    <line x1="32" y1="46" x2="32" y2="50" stroke="#b0916a" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    <line x1="8" y1="32" x2="18" y2="32" stroke="#b0916a" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    <line x1="46" y1="32" x2="56" y2="32" stroke="#b0916a" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    {/* Center dot */}
                    <circle cx="32" cy="32" r="2" fill="#e8723a" />
                </svg>
                {/* Sonar ping */}
                <motion.div
                    className="absolute inset-0 rounded-full border border-teal"
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    style={{ originX: '50%', originY: '50%' }}
                />
            </div>

            {/* Text */}
            <h1 className={`font-sans tracking-tight ${isLarge ? 'text-3xl' : 'text-lg'}`}>
                <span className="font-light text-text-primary">Circle</span>
                <span className="font-bold text-buoy"> Cutting</span>
            </h1>
        </div>
    );
}
