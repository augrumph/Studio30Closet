import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-300" />
        </div>
      )}
      <h3 className="font-display text-xl text-gray-400 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-300 text-center max-w-md mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
