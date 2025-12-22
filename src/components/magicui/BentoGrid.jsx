import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function BentoGrid({ className, children }) {
    return (
        <div
            className={cn(
                "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 auto-rows-[220px]",
                className
            )}
        >
            {children}
        </div>
    )
}

export function BentoCard({
    name,
    className,
    background,
    Icon,
    description,
    value,
    href,
    cta,
}) {
    return (
        <div
            key={name}
            className={cn(
                "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-[2.5rem]",
                "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
                "transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
                className
            )}
        >
            <div>{background}</div>
            <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-2 p-8 transition-all duration-300 group-hover:-translate-y-2">
                <Icon className="h-12 w-12 origin-left transform-gpu text-[#C75D3B] transition-all duration-300 ease-in-out group-hover:scale-75" />
                <h3 className="text-2xl font-bold text-[#4A3B32]">{name}</h3>
                <p className="max-w-lg text-[#4A3B32]/60 font-medium leading-relaxed">{description}</p>
                {value && <div className="mt-4 text-4xl font-bold text-[#4A3B32] tracking-tight">{value}</div>}
            </div>

            <div
                className={cn(
                    "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                )}
            >
                <button className="pointer-events-auto px-6 py-2.5 bg-[#4A3B32] text-white text-xs font-bold rounded-full shadow-lg shadow-[#4A3B32]/20">
                    {cta || "Ver Detalhes"}
                </button>
            </div>
            <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03]" />
        </div>
    )
}
