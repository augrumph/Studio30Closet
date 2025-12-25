import { motion } from 'framer-motion'

/**
 * AnimatedPage - Wrapper para página com transições suaves
 * Aplica fade-in e subtle slide-up ao entrar na página
 */
export function AnimatedPage({ children, className = '' }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
                duration: 0.3,
                ease: 'easeOut'
            }}
        >
            {children}
        </motion.div>
    )
}
