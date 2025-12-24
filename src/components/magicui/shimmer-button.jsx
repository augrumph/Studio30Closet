import React from "react"
import { cn } from "@/lib/utils"

export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerSize = "0.1em",
  borderRadius = "16px",
  shimmerDuration = "2s",
  background = "linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)",
  className,
  children,
  ...props
}) {
  return (
    <button
      style={{
        "--spread": "90deg",
        "--shimmer-color": shimmerColor,
        "--radius": borderRadius,
        "--speed": shimmerDuration,
        "--cut": shimmerSize,
        "--bg": background,
      }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] transition-all active:scale-95",
        "transform-gpu transition-transform duration-300 ease-in-out hover:scale-105",
        className
      )}
      {...props}
    >
      {/* Spark container */}
      <div
        className={cn(
          "-z-30 blur-[2px]",
          "absolute inset-0 overflow-visible [container-type:size]"
        )}
      >
        {/* Spark */}
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
          {/* Spark before */}
          <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
        </div>
      </div>

      {children}

      {/* Highlight */}
      <div
        className={cn(
          "insert-0 absolute h-full w-full",
          "rounded-[--radius] px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
          // Transition
          "transform-gpu transition-all duration-300 ease-in-out",
          // Group hover
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]"
        )}
      />

      {/* Backdrop */}
      <div
        className={cn(
          "absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]"
        )}
      />
    </button>
  )
}
