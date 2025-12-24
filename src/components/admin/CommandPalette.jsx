import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Package, ShoppingCart, Settings, Users, BarChart3, Plus, Search, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

const commandItems = [
  {
    group: 'Navega\u00e7\u00e3o',
    items: [
      { icon: Package, label: 'Produtos', path: '/admin/products', keywords: 'produtos catalogo estoque' },
      { icon: ShoppingCart, label: 'Vendas', path: '/admin/vendas', keywords: 'vendas pedidos orders' },
      { icon: Settings, label: 'Configura\u00e7\u00f5es', path: '/admin/settings', keywords: 'settings config' },
      { icon: BarChart3, label: 'Dashboard', path: '/admin', keywords: 'dashboard home analytics' },
    ]
  },
  {
    group: 'A\u00e7\u00f5es R\u00e1pidas',
    items: [
      { icon: Plus, label: 'Novo Produto', path: '/admin/products/new', keywords: 'criar novo produto add' },
      { icon: Plus, label: 'Nova Venda', path: '/admin/vendas/new', keywords: 'criar nova venda pedido order' },
    ]
  },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = (callback) => {
    setOpen(false)
    callback()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou procure..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {commandItems.map((group, i) => (
          <CommandGroup key={i} heading={group.group}>
            {group.items.map((item, j) => (
              <CommandItem
                key={j}
                keywords={[item.keywords]}
                onSelect={() => handleSelect(() => navigate(item.path))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />

        <CommandGroup heading="Sistema">
          <CommandItem onSelect={() => handleSelect(() => logout())}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
