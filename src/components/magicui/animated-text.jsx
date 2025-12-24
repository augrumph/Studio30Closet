import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function FadeText({ text, className, direction = "up", framerProps, ...props }) {
  const FADE_ANIMATION_VARIANTS = {
    up: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    },
    down: {
      hidden: { opacity: 0, y: -20 },
      show: { opacity: 1, y: 0 },
    },
    left: {
      hidden: { opacity: 0, x: -20 },
      show: { opacity: 1, x: 0 },
    },
    right: {
      hidden: { opacity: 0, x: 20 },
      show: { opacity: 1, x: 0 },
    },
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      viewport={{ once: true }}
      variants={FADE_ANIMATION_VARIANTS[direction]}
      {...framerProps}
    >
      <span className={cn(className)} {...props}>
        {text}
      </span>
    </motion.div>
  )
}

export function WordReveal({ text, className, ...props }) {
  const words = text.split(" ")

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className={cn("overflow-hidden", className)}
      {...props}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                delay: i * 0.1,
              },
            },
          }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

export function TypingAnimation({ text, duration = 50, className, ...props }) {
  const letters = Array.from(text)

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: duration / 1000, delayChildren: 0.04 * i },
    }),
  }

  const child = {
    visible: {
      opacity: 1,
      transition: {
        type: "tween",
        ease: "easeIn",
      },
    },
    hidden: {
      opacity: 0,
    },
  }

  return (
    <motion.div
      style={{ display: "flex", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn(className)}
      {...props}
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child}>
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.div>
  )
}
