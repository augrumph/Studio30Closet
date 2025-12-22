import { cn } from "@/lib/utils"

export function Card({ className, ...props }) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md",
                className
            )}
            {...props}
        />
    )
}

export function CardHeader({ className, ...props }) {
    return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
}

export function CardTitle({ className, ...props }) {
    return (
        <h3
            className={cn("text-lg font-semibold leading-none tracking-tight text-[#4A3B32]", className)}
            {...props}
        />
    )
}

export function CardDescription({ className, ...props }) {
    return <p className={cn("text-sm text-[#4A3B32]/50", className)} {...props} />
}

export function CardContent({ className, ...props }) {
    return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function CardFooter({ className, ...props }) {
    return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
}
