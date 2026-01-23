import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition = {
  type: "tween" as const,
  duration: 0.25,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  
  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};
