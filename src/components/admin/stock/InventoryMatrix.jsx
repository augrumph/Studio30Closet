
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function InventoryMatrix({ inventory, loading }) {
    if (loading) return null
    if (!inventory || inventory.length === 0) return null

    // Agrupar dados para o Heatmap
    // Eixos: Categoria (Y) vs Performance (X - ABC Class)

    // Preparar dados
    const categories = [...new Set(inventory.map(p => p.category || 'Outros'))].sort()

    // Matrix Data: category -> { A: count, B: count, C: count, Dead: count }
    const matrix = {}

    categories.forEach(cat => {
        matrix[cat] = { A: 0, B: 0, C: 0, Dead: 0, TotalValue: 0 }
    })

    inventory.forEach(p => {
        const cat = p.category || 'Outros'
        if (matrix[cat]) {
            matrix[cat].TotalValue += (p.price * p.stock)

            // Se Dead Stock (> 90 dias sem venda e estoque > 0)
            if (p.stock > 0 && p.stats.soldQty30d === 0 && p.daysInStock > 90) {
                matrix[cat].Dead++
            } else {
                // ABC Normal
                matrix[cat][p.abcClass]++
            }
        }
    })

    return (
        <Card className="shadow-sm border border-gray-100 mt-8">
            <CardHeader className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-display text-[#4A3B32]">Matriz de Inventário (Categorias vs Qualidade)</CardTitle>
                    <div className="flex gap-4 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Classe A (Ouro)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Classe B (Prata)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Classe C (Bronze)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Dead Stock</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#FAF3F0] text-[#4A3B32] font-bold text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-3">Categoria</th>
                            <th className="px-4 py-3 text-center w-24">Valor Total</th>
                            <th className="px-2 py-3 text-center w-16">Classe A</th>
                            <th className="px-2 py-3 text-center w-16">Classe B</th>
                            <th className="px-2 py-3 text-center w-16">Classe C</th>
                            <th className="px-2 py-3 text-center w-20 text-red-600">Parado</th>
                            <th className="px-4 py-3 w-1/3">Distribuição Visual</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {categories.map(cat => {
                            const data = matrix[cat]
                            const totalItems = data.A + data.B + data.C + data.Dead
                            if (totalItems === 0) return null

                            const pct = (val) => (val / totalItems) * 100

                            return (
                                <tr key={cat} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-bold text-[#4A3B32]">{cat}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">
                                        R$ {(data.TotalValue / 1000).toFixed(1)}k
                                    </td>
                                    <td className="px-2 py-3 text-center text-emerald-600 font-bold bg-emerald-50/30">{data.A}</td>
                                    <td className="px-2 py-3 text-center text-blue-500 font-bold bg-blue-50/30">{data.B}</td>
                                    <td className="px-2 py-3 text-center text-gray-400 font-bold bg-gray-50/30">{data.C}</td>
                                    <td className="px-2 py-3 text-center text-red-500 font-bold bg-red-50/30">{data.Dead}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100">
                                            <div style={{ width: `${pct(data.A)}%` }} className="bg-emerald-500" title={`A: ${data.A}`} />
                                            <div style={{ width: `${pct(data.B)}%` }} className="bg-blue-400" title={`B: ${data.B}`} />
                                            <div style={{ width: `${pct(data.C)}%` }} className="bg-gray-300" title={`C: ${data.C}`} />
                                            <div style={{ width: `${pct(data.Dead)}%` }} className="bg-red-400" title={`Dead: ${data.Dead}`} />
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}
