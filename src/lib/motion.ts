import type { Transition, Variants } from "framer-motion";

// Shared timing so every module's motion feels like one system instead of
// hand-rolled ad hoc numbers - 150-250ms, ease-out, nothing flashy.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const DURATION_FAST = 0.15;
export const DURATION_BASE = 0.2;
export const DURATION_SLOW = 0.25;

export const transitionBase: Transition = { duration: DURATION_BASE, ease: EASE_OUT };
export const transitionFast: Transition = { duration: DURATION_FAST, ease: EASE_OUT };
export const transitionSlow: Transition = { duration: DURATION_SLOW, ease: EASE_OUT };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: transitionSlow },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitionBase },
};

// Apply to a parent; children using fadeInUp/fadeIn stagger in automatically.
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

// Spread onto a motion component for the standard card hover-lift.
export const hoverLift = {
  whileHover: { y: -2, transition: transitionFast },
  whileTap: { scale: 0.99, transition: transitionFast },
};
