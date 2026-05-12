import { useState, useEffect, useCallback } from 'react'
import {
    Truck, Receipt, Mail, CreditCard, RefreshCw, CheckCircle2, AlertCircle,
    Clock, Save, FlaskConical, Eye, EyeOff, ChevronRight, Settings,
    Package, MapPin, Building2, Phone, Hash, Globe, Zap, Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status, env }) {
    const cfg = {
        connected: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Online' },
        error:     { cls: 'bg-red-100 text-red-700',         icon: AlertCircle,  label: 'Erro'   },
        loading:   { cls: 'bg-gray-100 text-gray-500',        icon: Clock,        label: '...'    },
    }[status || 'loading']
    const Icon = cfg.icon
    return (
        <div className="flex items-center gap-1.5">
            <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold', cfg.cls)}>
                <Icon className="w-3 h-3" />{cfg.label}
            </span>
            {env && (
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide', env === 'production' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                    {env === 'production' ? 'PRD' : 'SANDBOX'}
                </span>
            )}
        </div>
    )
}

function EnvToggle({ value, onChange }) {
    const isPrd = value === 'production'
    return (
        <div className="flex items-center gap-3">
            <span className={cn('text-sm font-semibold', !isPrd ? 'text-amber-600' : 'text-gray-400')}>Sandbox</span>
            <button
                type="button"
                onClick={() => onChange(isPrd ? 'sandbox' : 'production')}
                className={cn('relative w-12 h-6 rounded-full transition-colors duration-200', isPrd ? 'bg-blue-600' : 'bg-amber-400')}
            >
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200', isPrd ? 'translate-x-6' : 'translate-x-0')} />
            </button>
            <span className={cn('text-sm font-semibold', isPrd ? 'text-blue-600' : 'text-gray-400')}>Produção</span>
        </div>
    )
}

function SecretField({ label, envKey, value, onChange, hasValue, hint }) {
    const [show, setShow] = useState(false)
    const [focused, setFocused] = useState(false)
    return (
        <div>
            <label className="block text-xs font-bold text-[#4A3B32]/50 uppercase tracking-widest mb-1.5">
                {label}
                {hasValue && !focused && !value && (
                    <span className="ml-2 text-emerald-600 font-normal normal-case tracking-normal">✓ configurado</span>
                )}
            </label>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={hasValue && !value ? '••••••••••••••••••••' : hint || `Novo ${label}`}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium text-[#4A3B32] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20 focus:bg-white transition-all pr-10"
                />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}

function TextField({ label, envKey, value, onChange, placeholder, hint, mono }) {
    return (
        <div>
            <label className="block text-xs font-bold text-[#4A3B32]/50 uppercase tracking-widest mb-1.5">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder || label}
                className={cn('w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium text-[#4A3B32] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20 focus:bg-white transition-all', mono && 'font-mono')}
            />
            {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
        </div>
    )
}

// ── Tab components ────────────────────────────────────────────────────────────

function MelhorEnvioTab({ cfg, hasValues, status, onChange, onTest, onSave, testing, saving }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="font-bold text-[#4A3B32]">Melhor Envio — Frete & Etiquetas</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{status?.message || 'Verificando...'}</p>
                </div>
                <EnvToggle value={cfg.MELHOR_ENVIO_ENV || 'sandbox'} onChange={v => onChange('MELHOR_ENVIO_ENV', v)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <SecretField label="Token de Acesso" envKey="MELHOR_ENVIO_TOKEN" value={cfg.MELHOR_ENVIO_TOKEN || ''} onChange={v => onChange('MELHOR_ENVIO_TOKEN', v)} hasValue={hasValues.MELHOR_ENVIO_TOKEN} hint="Bearer token OAuth do painel Melhor Envio" />
                <TextField label="User-Agent" value={cfg.MELHOR_ENVIO_USER_AGENT || ''} onChange={v => onChange('MELHOR_ENVIO_USER_AGENT', v)} placeholder="Studio30 Closet (email@exemplo.com)" hint="Obrigatório pela política da API" />
            </div>

            <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-widest mb-4">Endereço de Origem dos Envios</p>
                <div className="grid sm:grid-cols-2 gap-4">
                    <TextField label="Nome da Loja" value={cfg.STORE_NAME || ''} onChange={v => onChange('STORE_NAME', v)} />
                    <TextField label="CEP de Origem" value={cfg.STORE_ORIGIN_ZIP_CODE || ''} onChange={v => onChange('STORE_ORIGIN_ZIP_CODE', v)} mono />
                    <TextField label="Rua" value={cfg.STORE_ADDRESS || ''} onChange={v => onChange('STORE_ADDRESS', v)} />
                    <div className="grid grid-cols-2 gap-3">
                        <TextField label="Número" value={cfg.STORE_ADDRESS_NUMBER || ''} onChange={v => onChange('STORE_ADDRESS_NUMBER', v)} />
                        <TextField label="Bairro" value={cfg.STORE_DISTRICT || ''} onChange={v => onChange('STORE_DISTRICT', v)} />
                    </div>
                    <TextField label="Cidade" value={cfg.STORE_CITY || ''} onChange={v => onChange('STORE_CITY', v)} />
                    <TextField label="Estado (UF)" value={cfg.STORE_STATE || ''} onChange={v => onChange('STORE_STATE', v)} />
                    <TextField label="CPF / CNPJ" value={cfg.STORE_DOCUMENT || ''} onChange={v => onChange('STORE_DOCUMENT', v)} mono />
                    <TextField label="Telefone" value={cfg.STORE_PHONE || ''} onChange={v => onChange('STORE_PHONE', v)} />
                    <TextField label="E-mail" value={cfg.STORE_EMAIL || ''} onChange={v => onChange('STORE_EMAIL', v)} className="sm:col-span-2" />
                </div>
            </div>

            <ActionBar onTest={onTest} onSave={onSave} testing={testing} saving={saving} service="melhor-envio" />
        </div>
    )
}

function AbacatePayTab({ cfg, hasValues, status, onChange, onTest, onSave, testing, saving }) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-[#4A3B32]">Abacate Pay — Pagamentos PIX & Cartão</h3>
                <p className="text-sm text-gray-500 mt-0.5">{status?.message || 'Verificando...'}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <SecretField label="Token da API" envKey="ABACATE_PAY_TOKEN" value={cfg.ABACATE_PAY_TOKEN || ''} onChange={v => onChange('ABACATE_PAY_TOKEN', v)} hasValue={hasValues.ABACATE_PAY_TOKEN} hint="Painel Abacate Pay → API Keys" />
                <TextField label="Product ID" value={cfg.ABACATE_PAY_PRODUCT_ID || ''} onChange={v => onChange('ABACATE_PAY_PRODUCT_ID', v)} hint="ID do produto de checkout criado no painel" mono />
                <SecretField label="Webhook Secret" envKey="ABACATE_WEBHOOK_SECRET" value={cfg.ABACATE_WEBHOOK_SECRET || ''} onChange={v => onChange('ABACATE_WEBHOOK_SECRET', v)} hasValue={hasValues.ABACATE_WEBHOOK_SECRET} hint="Gerado ao cadastrar o webhook" />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4" />URL do Webhook a cadastrar no painel Abacate Pay
                </p>
                <code className="text-xs text-blue-700 font-mono break-all">
                    {(cfg.FRONTEND_URL || 'https://studio30closet.com.br').replace(/\/$/, '')}/api/webhooks/abacate-pay
                </code>
                <p className="text-[11px] text-blue-600 mt-2">Eventos: <strong>checkout.completed · checkout.refunded · checkout.disputed</strong></p>
            </div>

            <ActionBar onTest={onTest} onSave={onSave} testing={testing} saving={saving} service="abacate-pay" />
        </div>
    )
}

function ResendTab({ cfg, hasValues, status, onChange, onTest, onSave, testing, saving }) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-[#4A3B32]">Resend — E-mails Transacionais</h3>
                <p className="text-sm text-gray-500 mt-0.5">{status?.message || 'Verificando...'}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <SecretField label="API Key" envKey="RESEND_API_KEY" value={cfg.RESEND_API_KEY || ''} onChange={v => onChange('RESEND_API_KEY', v)} hasValue={hasValues.RESEND_API_KEY} hint="resend.com → API Keys → Create API Key" />
                <TextField label="E-mail Remetente" value={cfg.RESEND_FROM_EMAIL || ''} onChange={v => onChange('RESEND_FROM_EMAIL', v)} placeholder="Studio30 Closet <pedidos@studio30closet.com.br>" hint="Domínio precisa estar verificado no Resend" />
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                <p className="text-sm font-bold text-amber-800">Checklist de verificação de domínio</p>
                {[
                    { label: 'SPF', detail: 'Adicionar registro TXT no DNS' },
                    { label: 'DKIM', detail: 'Adicionar dois registros TXT no DNS' },
                    { label: 'DMARC', detail: 'Adicionar registro TXT _dmarc no DNS' },
                ].map(({ label, detail }) => (
                    <div key={label} className="flex items-center gap-2 text-sm text-amber-700">
                        <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-black">{label[0]}</div>
                        <span><strong>{label}</strong> — {detail}</span>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">E-mails automáticos configurados</p>
                {[
                    'Pedido criado (aguardando pagamento)',
                    'Pagamento aprovado',
                    'Envio com código de rastreio',
                ].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {t}
                    </div>
                ))}
            </div>

            <ActionBar onTest={onTest} onSave={onSave} testing={testing} saving={saving} service="resend" />
        </div>
    )
}

function NuvemFiscalTab({ cfg, hasValues, status, onChange, onTest, onSave, testing, saving }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="font-bold text-[#4A3B32]">Nuvem Fiscal — NF-e</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{status?.message || 'Verificando...'}</p>
                </div>
                <EnvToggle value={cfg.NUVEM_FISCAL_ENV || 'sandbox'} onChange={v => onChange('NUVEM_FISCAL_ENV', v)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <TextField label="Client ID" value={cfg.NUVEM_FISCAL_CLIENT_ID || ''} onChange={v => onChange('NUVEM_FISCAL_CLIENT_ID', v)} mono />
                <SecretField label="Client Secret" envKey="NUVEM_FISCAL_CLIENT_SECRET" value={cfg.NUVEM_FISCAL_CLIENT_SECRET || ''} onChange={v => onChange('NUVEM_FISCAL_CLIENT_SECRET', v)} hasValue={hasValues.NUVEM_FISCAL_CLIENT_SECRET} />
                <TextField label="CNPJ da Empresa" value={cfg.NUVEM_FISCAL_COMPANY_CNPJ || ''} onChange={v => onChange('NUVEM_FISCAL_COMPANY_CNPJ', v)} placeholder="00000000000000" mono />
                <TextField label="Scope" value={cfg.NUVEM_FISCAL_SCOPE || 'empresa nfe'} onChange={v => onChange('NUVEM_FISCAL_SCOPE', v)} hint="Default: empresa nfe" />
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
                    <Receipt className="w-4 h-4" />
                    Pendência com contador
                </p>
                <p className="text-sm text-amber-700">
                    Cada produto precisa ter <strong>NCM, CFOP e CEST</strong> preenchidos no cadastro para que a NF-e seja aceita pela Sefaz.
                    Peça ao seu contador as códigos de cada categoria (vestidos, blusas, calças, etc.).
                </p>
            </div>

            <ActionBar onTest={onTest} onSave={onSave} testing={testing} saving={saving} service="nuvem-fiscal" />
        </div>
    )
}

function ActionBar({ onTest, onSave, testing, saving, service }) {
    return (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
                type="button"
                onClick={() => onTest(service)}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-[#4A3B32] hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
                <FlaskConical className={cn('w-4 h-4', testing ? 'animate-pulse text-[#C75D3B]' : '')} />
                {testing ? 'Testando…' : 'Testar conexão'}
            </button>
            <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A3B32] hover:bg-[#C75D3B] text-white text-sm font-bold disabled:opacity-50 transition-colors"
            >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando…' : 'Salvar'}
            </button>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = [
    { id: 'melhor-envio', label: 'Melhor Envio',  icon: Truck,      statusKey: 'melhorEnvio'  },
    { id: 'abacate-pay',  label: 'Abacate Pay',   icon: CreditCard, statusKey: 'abacatePay'   },
    { id: 'resend',       label: 'Resend',         icon: Mail,       statusKey: 'resend'       },
    { id: 'nuvem-fiscal', label: 'Nuvem Fiscal',  icon: Receipt,    statusKey: 'nuvemFiscal'  },
]

export function LogisticsFiscal() {
    const [activeTab, setActiveTab] = useState('melhor-envio')
    const [status, setStatus] = useState({})
    const [statusLoading, setStatusLoading] = useState(true)
    const [cfg, setCfg] = useState({})
    const [hasValues, setHasValues] = useState({})
    const [testing, setTesting] = useState(false)
    const [saving, setSaving] = useState(false)

    const loadStatus = useCallback(async () => {
        setStatusLoading(true)
        try {
            const data = await apiClient('/integrations/status')
            setStatus(data)
        } catch { toast.error('Falha ao carregar status') }
        finally { setStatusLoading(false) }
    }, [])

    const loadConfig = useCallback(async () => {
        try {
            const data = await apiClient('/integrations/config')
            const { _hasValues = {}, ...rest } = data
            setCfg(rest)
            setHasValues(_hasValues)
        } catch { toast.error('Falha ao carregar configurações') }
    }, [])

    useEffect(() => { loadStatus(); loadConfig() }, [])

    const handleChange = (key, value) => setCfg(prev => ({ ...prev, [key]: value }))

    const handleTest = async (service) => {
        setTesting(true)
        try {
            const data = await apiClient(`/integrations/test/${service}`, { method: 'POST' })
            if (data.ok) {
                toast.success(data.message || 'Conexão bem-sucedida!')
            } else {
                toast.error(data.message || 'Falha no teste')
            }
            // Refresh status after test
            loadStatus()
        } catch (e) {
            toast.error(e.message || 'Erro ao testar')
        } finally { setTesting(false) }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await apiClient('/integrations/config', { method: 'PATCH', body: JSON.stringify(cfg) })
            toast.success(`Salvo! (${result.saved?.length || 0} campo(s) atualizados)`)
            // Reload config to get updated masked values
            await loadConfig()
            await loadStatus()
        } catch (e) {
            toast.error(e.message || 'Erro ao salvar')
        } finally { setSaving(false) }
    }

    const tabProps = { cfg, hasValues, onChange: handleChange, onTest: handleTest, onSave: handleSave, testing, saving }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#4A3B32] rounded-2xl shadow-lg">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Integrações</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium mt-2">Configure e teste Melhor Envio, Abacate Pay, Resend e Nuvem Fiscal</p>
                </div>
                <button onClick={loadStatus} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#4A3B32] hover:bg-gray-50 transition-colors">
                    <RefreshCw className={cn('w-4 h-4', statusLoading && 'animate-spin')} />
                    Atualizar status
                </button>
            </div>

            {/* Status overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {TABS.map(tab => {
                    const s = status[tab.statusKey] || {}
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'rounded-2xl p-4 text-left transition-all border-2',
                                activeTab === tab.id
                                    ? 'border-[#4A3B32] bg-white shadow-md'
                                    : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
                            )}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={cn('p-2 rounded-xl', s.status === 'connected' ? 'bg-emerald-50' : s.status === 'error' ? 'bg-red-50' : 'bg-gray-50')}>
                                    <Icon className={cn('w-4 h-4', s.status === 'connected' ? 'text-emerald-600' : s.status === 'error' ? 'text-red-500' : 'text-gray-400')} />
                                </div>
                                {statusLoading ? (
                                    <div className="w-16 h-5 bg-gray-100 rounded-full animate-pulse" />
                                ) : (
                                    <StatusBadge status={s.status} env={s.env} />
                                )}
                            </div>
                            <p className="text-sm font-bold text-[#4A3B32]">{tab.label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{s.message || '—'}</p>
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Tab nav */}
                <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        const s = status[tab.statusKey] || {}
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all',
                                    activeTab === tab.id
                                        ? 'border-[#C75D3B] text-[#C75D3B] bg-[#C75D3B]/3'
                                        : 'border-transparent text-gray-500 hover:text-[#4A3B32]'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {s.status === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                                {s.status === 'connected' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                            </button>
                        )
                    })}
                </div>

                {/* Active tab panel */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="p-6"
                    >
                        {activeTab === 'melhor-envio' && <MelhorEnvioTab {...tabProps} status={status.melhorEnvio} />}
                        {activeTab === 'abacate-pay'  && <AbacatePayTab  {...tabProps} status={status.abacatePay}  />}
                        {activeTab === 'resend'        && <ResendTab       {...tabProps} status={status.resend}       />}
                        {activeTab === 'nuvem-fiscal'  && <NuvemFiscalTab  {...tabProps} status={status.nuvemFiscal}  />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Webhook URLs */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />URLs de webhook (cadastrar nos painéis de cada serviço)
                </p>
                <div className="space-y-2">
                    {[
                        { label: 'Abacate Pay', path: '/api/webhooks/abacate-pay', events: 'checkout.completed · checkout.refunded · checkout.disputed' },
                        { label: 'Melhor Envio', path: '/api/webhooks/melhor-envio', events: 'shipment tracking events' },
                    ].map(({ label, path, events }) => (
                        <div key={path} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#4A3B32]">{label}</p>
                                <code className="text-xs text-gray-500 font-mono break-all">
                                    {cfg.FRONTEND_URL || 'https://studio30closet.com.br'}{path}
                                </code>
                                <p className="text-[11px] text-gray-400 mt-0.5">{events}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
