import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function ResponsiveTable({ columns, data, onRowClick, emptyMessage = "Nenhum registro encontrado." }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400 italic">
                {emptyMessage}
            </div>
        )
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={cn(
                                        "py-3 px-4 text-xs font-bold text-gray-500 uppercase",
                                        col.align === 'right' ? 'text-right' :
                                        col.align === 'center' ? 'text-center' : 'text-left'
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIdx) => (
                            <motion.tr
                                key={row.id || rowIdx}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: rowIdx * 0.03 }}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={cn(
                                    "border-b border-gray-50 transition-colors",
                                    onRowClick && "cursor-pointer hover:bg-gray-50"
                                )}
                            >
                                {columns.map((col, colIdx) => (
                                    <td
                                        key={colIdx}
                                        className={cn(
                                            "py-3 px-4",
                                            col.align === 'right' ? 'text-right' :
                                            col.align === 'center' ? 'text-center' : 'text-left'
                                        )}
                                    >
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {data.map((row, rowIdx) => (
                    <motion.div
                        key={row.id || rowIdx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: rowIdx * 0.05 }}
                        onClick={() => onRowClick && onRowClick(row)}
                        className={cn(
                            "bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3",
                            onRowClick && "active:shadow-md transition-shadow"
                        )}
                    >
                        {columns
                            .filter(col => !col.hideOnMobile)
                            .map((col, colIdx) => (
                                <div key={colIdx} className="flex justify-between items-start gap-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase flex-shrink-0">
                                        {col.mobileLabel || col.header}
                                    </span>
                                    <div className="text-sm font-medium text-[#4A3B32] text-right flex-1 min-w-0">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </div>
                                </div>
                            ))}
                    </motion.div>
                ))}
            </div>
        </>
    )
}
