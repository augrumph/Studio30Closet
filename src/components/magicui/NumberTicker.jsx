import { useEffect, useRef } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"

export function NumberTicker({
    value,
    direction = "up",
    delay = 0,
    className,
}) {
    const ref = useRef(null)
    const motionValue = useMotionValue(direction === "down" ? value : 0)
    const springValue = useSpring(motionValue, {
        damping: 60,
        stiffness: 100,
    })
    const isInView = useInView(ref, { once: true, margin: "0px" })

    useEffect(() => {
        if (isInView) {
            setTimeout(() => {
                motionValue.set(direction === "down" ? 0 : value)
            }, delay * 1000)
        }
    }, [motionValue, isInView, delay, value, direction])

    useEffect(
        () =>
            springValue.on("change", (latest) => {
                if (ref.current) {
                    ref.current.textContent = Intl.NumberFormat("pt-BR", {
                        minimumFractionDigits: typeof value === "number" && !Number.isInteger(value) ? 2 : 0,
                        maximumFractionDigits: 2,
                    }).format(latest.toFixed(2))
                }
            }),
        [springValue, value]
    )

    return (
        <span
            className={className}
            ref={ref}
        />
    )
}
