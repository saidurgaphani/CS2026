import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export const MultiStepLoader = ({ loadingStates, duration = 2000, loop = true }: { loadingStates: { text: string }[]; duration?: number; loop?: boolean }) => {
    const [currentState, setCurrentState] = useState(0);

    useEffect(() => {
        if (!loadingStates || loadingStates.length === 0) return;
        const interval = setInterval(() => {
            setCurrentState((prev) => (prev === loadingStates.length - 1 ? (loop ? 0 : prev) : prev + 1));
        }, duration);
        return () => clearInterval(interval);
    }, [loadingStates, duration, loop]);

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <motion.div
                className="relative w-16 h-16"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute inset-0 rounded-full border-t-4 border-indigo-500 opacity-75"></div>
                <div className="absolute inset-0 rounded-full border-r-4 border-purple-500 opacity-50"></div>
                <div className="absolute inset-0 rounded-full border-b-4 border-pink-500 opacity-25"></div>
            </motion.div>
            <div className="h-8 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={currentState}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                        className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap"
                    >
                        {loadingStates[currentState]?.text || "Gathering Intelligence..."}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
};
