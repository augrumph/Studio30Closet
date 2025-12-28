import { Download } from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';
import { generateCatalogPDF } from '@/utils/pdfCatalogGenerator';
import { toast } from 'sonner';

export const CatalogPDFButton = () => {
  const { products, loadAllProductsForCatalog, productsLoading } = useAdminStore();

  const handleGeneratePDF = async () => {
    try {
      // If we don't have all products loaded, load them first
      if (products.length === 0) {
        toast.info('Carregando catálogo completo...');
        await loadAllProductsForCatalog();
      }

      // Generate the PDF with all products
      await generateCatalogPDF(products);

      toast.success('Catálogo PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o catálogo PDF. Tente novamente.');
    }
  };

  return (
    <button
      onClick={handleGeneratePDF}
      disabled={productsLoading}
      className="w-full mt-2 py-1.5 px-3 bg-white text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {productsLoading ? 'Carregando...' : 'Gerar PDF'}
    </button>
  );
};