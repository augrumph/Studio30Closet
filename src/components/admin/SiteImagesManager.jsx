import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { useSiteImages } from '@/hooks/useSiteImages'
import { Upload, Image as ImageIcon, Loader2, Check, Home, Route, ExternalLink, Trash2, X, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Alert } from '@/components/ui/Alert'

const imageFields = {
  home: [
    { key: 'hero_logo', label: 'Logo Hero', description: 'Logo principal da página inicial' },
    { key: 'how_it_works_section_image', label: 'Seção Como Funciona', description: 'Imagem da seção "Como Funciona" na home' }
  ],
  howItWorks: [
    { key: 'step_1_image', label: 'Passo 1 - Monte sua Malinha', description: 'Imagem do primeiro passo' },
    { key: 'step_2_image', label: 'Passo 2 - Receba com Carinho', description: 'Imagem do segundo passo' },
    { key: 'step_3_image', label: 'Passo 3 - Experimente em Casa', description: 'Imagem do terceiro passo' },
    { key: 'step_4_image', label: 'Passo 4 - Devolva o Resto', description: 'Imagem do quarto passo' }
  ],
  about: [
    { key: 'about_hero_image', label: 'Hero Sobre Nós', description: 'Foto principal da página Sobre Nós' }
  ]
}

function ImageUploadCard({ field, currentUrl, onUpload, uploading }) {
  const [newImagePreview, setNewImagePreview] = useState(null) // Preview da nova imagem
  const [newImageFile, setNewImageFile] = useState(null) // Arquivo ou URL da nova imagem
  const [newImageType, setNewImageType] = useState(null) // 'file' ou 'url'
  const [urlInput, setUrlInput] = useState('')
  const [uploadMode, setUploadMode] = useState('file') // 'file' ou 'url'
  const [success, setSuccess] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Quando selecionar arquivo
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido')
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB')
      return
    }

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setNewImagePreview(reader.result)
      setNewImageFile(file)
      setNewImageType('file')
      setShowConfirmation(true)
    }
    reader.readAsDataURL(file)
  }

  // Quando adicionar URL
  const handleUrlSelect = () => {
    if (!urlInput) return

    setNewImagePreview(urlInput)
    setNewImageFile(urlInput)
    setNewImageType('url')
    setShowConfirmation(true)
  }

  // Confirmar upload
  const handleConfirmUpload = async () => {
    const result = await onUpload(
      field.key,
      newImageType === 'file' ? newImageFile : null,
      newImageType === 'url' ? newImageFile : null
    )

    if (result.success) {
      setSuccess(true)
      setShowConfirmation(false)
      setNewImagePreview(null)
      setNewImageFile(null)
      setNewImageType(null)
      setUrlInput('')

      setTimeout(() => setSuccess(false), 2000)
    }
  }

  // Cancelar upload
  const handleCancelUpload = () => {
    setNewImagePreview(null)
    setNewImageFile(null)
    setNewImageType(null)
    setShowConfirmation(false)
    setUrlInput('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:border-[#C75D3B]/30 transition-all hover:shadow-lg group"
    >
      {/* Preview das Imagens */}
      {showConfirmation ? (
        // Mostrar comparação antes e depois
        <div className="p-4 space-y-3">
          <Alert variant="warning">
            Confirme a substituição da imagem abaixo
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Imagem Atual */}
            <div className="space-y-2">
              <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Atual</p>
              <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 relative">
                {currentUrl ? (
                  <img
                    src={currentUrl}
                    alt="Atual"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Nova Imagem */}
            <div className="space-y-2">
              <p className="text-[10px] md:text-xs font-bold text-green-600 uppercase tracking-wider">Nova</p>
              <div className="aspect-video bg-gradient-to-br from-green-50 to-green-100 rounded-lg overflow-hidden border-2 border-green-300 relative">
                {newImagePreview && (
                  <img
                    src={newImagePreview}
                    alt="Nova"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-bold">
                  NOVA
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Confirmação */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleConfirmUpload}
              disabled={uploading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm py-2 md:py-3"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Substituindo...</span>
                  <span className="sm:hidden">Enviando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Confirmar Substituição</span>
                  <span className="sm:hidden">Confirmar</span>
                </>
              )}
            </Button>
            <Button
              onClick={handleCancelUpload}
              disabled={uploading}
              variant="outline"
              className="px-4 sm:px-6 text-xs md:text-sm"
            >
              <X className="w-4 h-4 mr-1 sm:mr-0" />
              <span className="sm:hidden">Cancelar</span>
            </Button>
          </div>
        </div>
      ) : (
        // Mostrar preview atual e opções de upload
        <>
          {/* Preview da Imagem Atual */}
          <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
            {currentUrl ? (
              <img
                src={currentUrl}
                alt={field.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
            )}

            {/* Badge de Sucesso */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 bg-green-500/90 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="text-center text-white">
                    <Check className="w-16 h-16 mx-auto mb-2" />
                    <p className="font-bold">Atualizado!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Badge "Atual" */}
            {currentUrl && !success && (
              <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-white/90 backdrop-blur-sm text-[#4A3B32] text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full font-bold shadow-lg">
                ATUAL
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            <div>
              <h3 className="font-display text-base md:text-lg font-bold text-[#4A3B32] mb-1">{field.label}</h3>
              <p className="text-xs md:text-sm text-gray-500">{field.description}</p>
            </div>

            {/* Tabs de Upload */}
            <Tabs value={uploadMode} onValueChange={setUploadMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 text-xs md:text-sm">
                <TabsTrigger value="file" className="px-2 md:px-4">
                  <span className="hidden sm:inline">Upload Arquivo</span>
                  <span className="sm:hidden">Arquivo</span>
                </TabsTrigger>
                <TabsTrigger value="url" className="px-2 md:px-4">
                  <span className="hidden sm:inline">URL Externa</span>
                  <span className="sm:hidden">URL</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-2 md:mt-3">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 md:p-4 hover:border-[#C75D3B] transition-colors text-center">
                    <Upload className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-gray-400" />
                    <p className="text-xs md:text-sm text-gray-600 font-medium">Clique para selecionar</p>
                    <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">PNG, JPG, WebP (máx. 5MB)</p>
                  </div>
                </label>
              </TabsContent>

              <TabsContent value="url" className="mt-2 md:mt-3 space-y-2">
                <Input
                  type="url"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={uploading}
                  className="text-xs md:text-sm"
                />
                <Button
                  onClick={handleUrlSelect}
                  disabled={uploading || !urlInput}
                  className="w-full bg-[#C75D3B] hover:bg-[#A64D31] text-xs md:text-sm"
                  size="sm"
                >
                  Visualizar Preview
                </Button>
              </TabsContent>
            </Tabs>

            {/* Link para preview */}
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] md:text-xs text-[#C75D3B] hover:underline flex items-center gap-1"
              >
                <span className="hidden sm:inline">Ver imagem atual em tela cheia</span>
                <span className="sm:hidden">Ver atual</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

export function SiteImagesManager({ isOpen, onClose }) {
  const { images, loading, uploading, uploadImage, updateImageUrl } = useSiteImages()

  const handleUpload = async (fieldKey, file, url) => {
    if (file) {
      return await uploadImage(file, fieldKey)
    } else if (url) {
      return await updateImageUrl(fieldKey, url)
    }
    return { success: false }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 md:gap-3 text-xl md:text-3xl">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] flex items-center justify-center">
              <ImageIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="leading-tight">Gerenciar Imagens</span>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Gerencie todas as imagens do site. Clique em uma imagem para editar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 md:py-20">
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-[#C75D3B]" />
          </div>
        ) : images ? (
          <Tabs defaultValue="home" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#FDFBF7] p-1 rounded-xl text-xs md:text-sm">
              <TabsTrigger value="home" className="flex items-center gap-1 md:gap-2 px-2 md:px-4">
                <Home className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Home</span>
              </TabsTrigger>
              <TabsTrigger value="howItWorks" className="flex items-center gap-1 md:gap-2 px-2 md:px-4">
                <Route className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Como Funciona</span>
                <span className="sm:hidden">Como</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-1 md:gap-2 px-2 md:px-4">
                <Info className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Sobre Nós</span>
                <span className="sm:hidden">Sobre</span>
              </TabsTrigger>
            </TabsList>

            {/* Home */}
            <TabsContent value="home" className="mt-4 md:mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {imageFields.home.map((field) => (
                  <ImageUploadCard
                    key={field.key}
                    field={field}
                    currentUrl={images?.[field.key]}
                    onUpload={handleUpload}
                    uploading={uploading}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Como Funciona */}
            <TabsContent value="howItWorks" className="mt-4 md:mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {imageFields.howItWorks.map((field) => (
                  <ImageUploadCard
                    key={field.key}
                    field={field}
                    currentUrl={images?.[field.key]}
                    onUpload={handleUpload}
                    uploading={uploading}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Sobre Nós */}
            <TabsContent value="about" className="mt-4 md:mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {imageFields.about.map((field) => (
                  <ImageUploadCard
                    key={field.key}
                    field={field}
                    currentUrl={images?.[field.key]}
                    onUpload={handleUpload}
                    uploading={uploading}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 md:py-20">
            <p className="text-gray-500 text-sm md:text-base">Nenhum dado encontrado. Execute o setup automático acima.</p>
          </div>
        )}

        {/* Footer com Info */}
        {images && (
          <div className="mt-4 md:mt-6 p-3 md:p-4 bg-[#FDF0ED] rounded-xl border border-[#C75D3B]/20">
            <p className="text-xs md:text-sm text-[#4A3B32]/70">
              <strong>💡 Dica:</strong> As alterações serão refletidas imediatamente no site.
              Imagens carregadas ficam armazenadas no Supabase Storage.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
