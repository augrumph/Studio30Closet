import { cn } from '@/lib/utils'

export function Separator({ className, orientation = "horizontal" }) {
    return (
        <div
            className={cn(
                "bg-gray-200",
                orientation === "horizontal" ? "h-px w-full" : "w-px h-full",
                className
            )}
        />
    )
}
