// Framer Motion animation variants

export const pageTransition = {
    initial: { x: 80, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { x: -80, opacity: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export const fadeInUp = {
    initial: { y: 24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -16, opacity: 0 },
};

export const staggerContainer = {
    animate: {
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

export const staggerItem = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const scaleIn = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 20 } },
};

export const circlePop = {
    initial: { scale: 0, opacity: 0 },
    animate: (i) => ({
        scale: 1,
        opacity: 1,
        transition: {
            delay: i * 0.012,
            type: 'spring',
            stiffness: 500,
            damping: 25,
        },
    }),
};

export const hoverLift = {
    whileHover: { y: -2, transition: { duration: 0.2 } },
    whileTap: { scale: 0.98 },
};

export const cardHover = {
    rest: { scale: 1, boxShadow: '0 0 0 rgba(63, 184, 160, 0)' },
    hover: {
        scale: 1.02,
        y: -2,
        boxShadow: '0 0 20px rgba(63, 184, 160, 0.15)',
        transition: { duration: 0.2 },
    },
};

export const pulseGlow = {
    animate: {
        opacity: [0.3, 0.7, 0.3],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
};
