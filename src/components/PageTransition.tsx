import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  animate: {
    opacity: 1,
    y: 0,
  },
};

const pageTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <motion.div
      variants={pageVariants}
      // Avoid any flash when the tab/window regains focus (component may re-mount in some cases)
      initial={false}
      animate="animate"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};
