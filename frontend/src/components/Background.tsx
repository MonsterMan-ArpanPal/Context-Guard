import { motion } from "framer-motion";

export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-[0.55]" />

      <motion.div
        className="absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-brand-500/[0.13] blur-[120px]"
        animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10%] top-[8%] h-[420px] w-[420px] rounded-full bg-cyan-500/[0.10] blur-[120px]"
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-20%] left-1/3 h-[460px] w-[460px] rounded-full bg-rose-500/[0.07] blur-[130px]"
        animate={{ y: [0, -40, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#04060b_78%)]" />
    </div>
  );
}
