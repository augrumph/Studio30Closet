import jsPDF from 'jspdf';
import logo from '/logostudio.PNG';

// Function to load image as base64
const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = reject;
    img.src = url;
  });
};

// Function to format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Function to format image URL safely
const formatImageUrl = (url) => {
  if (!url) return null;
  
  // Handle array of images (take first)
  if (Array.isArray(url) && url.length > 0) {
    return url[0];
  }
  
  // Handle single image URL
  if (typeof url === 'string') {
    // If it's a relative path, make it absolute
    if (url.startsWith('/')) {
      return url;
    }
    // If it's already an absolute URL, return as is
    if (url.startsWith('http')) {
      return url;
    }
  }
  
  return null;
};

// Function to add page numbers
const addPageNumbers = (doc) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
  }
};

// Function to draw header with brand styling
const drawHeader = (doc, pageHeight) => {
  // Background gradient effect
  doc.setFillColor(74, 59, 50); // #4A3B32
  doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
  
  // Add logo if available
  try {
    const logoWidth = 80;
    const logoHeight = 30;
    const logoX = 20;
    const logoY = 8;
    
    doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (e) {
    console.log('Logo not found, using text instead');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('Studio30 Closet', 20, 25);
  }
  
  // Title
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'normal');
  doc.text('Catálogo Completo de Produtos', doc.internal.pageSize.width / 2, 25, null, null, 'center');
  
  // Add decorative elements
  doc.setDrawColor(199, 93, 59); // #C75D3B
  doc.setLineWidth(0.5);
  doc.line(0, 40, doc.internal.pageSize.width, 40);
};

// Function to draw footer
const drawFooter = (doc, pageHeight) => {
  const footerY = pageHeight - 20;
  
  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, footerY, doc.internal.pageSize.width - 20, footerY);
  
  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Studio30 Closet - Catálogo de Produtos', 20, footerY + 10);
  doc.text('Contato: (XX) XXXXX-XXXX', doc.internal.pageSize.width - 100, footerY + 10);
};

// Main function to generate PDF catalog
export const generateCatalogPDF = async (products) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Add cover page
  addCoverPage(doc, products.length);
  
  // Process products in batches to create multiple pages
  const batchSize = 6; // Number of products per page (3 rows x 2 columns)
  const productBatches = [];
  
  for (let i = 0; i < products.length; i += batchSize) {
    productBatches.push(products.slice(i, i + batchSize));
  }
  
  // Process each batch - each batch gets its own page after the cover
  for (let batchIndex = 0; batchIndex < productBatches.length; batchIndex++) {
    // Add a new page for each batch (including the first one after cover)
    doc.addPage();

    // Draw header for each page
    drawHeader(doc, doc.internal.pageSize.height);

    // Calculate grid positions
    const startX = 20;
    const startY = 60;
    const cardWidth = 85;
    const cardHeight = 120;
    const spacingX = 15;
    const spacingY = 15;

    // Render products in a grid (2 columns x 3 rows per page)
    productBatches[batchIndex].forEach((product, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);

      const x = startX + (col * (cardWidth + spacingX));
      const y = startY + (row * (cardHeight + spacingY));

      renderProductCard(doc, product, x, y, cardWidth, cardHeight);
    });

    // Draw footer
    drawFooter(doc, doc.internal.pageSize.height);
  }
  
  // Add page numbers
  addPageNumbers(doc);
  
  // Save the PDF
  doc.save('catalogo-studio30.pdf');
};

// Function to render individual product card
const renderProductCard = (doc, product, x, y, width, height) => {
  // Card background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 5, 5, 'FD');
  
  // Add product image with proper aspect ratio
  const imageY = y + 5;
  const imageX = x + 5;
  const imageMaxWidth = width - 10;
  const imageMaxHeight = 60;

  const imageUrl = formatImageUrl(product.images);

  if (imageUrl) {
    try {
      // Add image maintaining aspect ratio using 'S' (Scaled) parameter
      doc.addImage(imageUrl, 'JPEG', imageX, imageY, imageMaxWidth, imageMaxHeight, null, 'SLOW', 0);
    } catch (e) {
      // If image fails to load, draw a placeholder
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Imagem', imageX + imageMaxWidth / 2, imageY + imageMaxHeight / 2, null, null, 'center');
    }
  } else {
    // Draw placeholder if no image
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Imagem', imageX + imageMaxWidth / 2, imageY + imageMaxHeight / 2, null, null, 'center');
  }

  // Draw a border around the image area
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(imageX, imageY, imageMaxWidth, imageMaxHeight);
  
  // Product name
  doc.setFontSize(9);
  doc.setTextColor(74, 59, 50); // #4A3B32
  doc.setFont(undefined, 'bold');

  const imageHeight = 60; // Define the image height that was used earlier
  const nameY = imageY + imageHeight + 5;
  const name = product.name || 'Nome não disponível';

  // Split name if too long
  const splitName = doc.splitTextToSize(name, width - 10);
  doc.text(splitName, x + 5, nameY);
  
  // Category
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.setFont(undefined, 'normal');
  const categoryY = nameY + (splitName.length * 4) + 2;
  const category = product.category || 'Categoria não definida';
  doc.text(category, x + 5, categoryY);
  
  // Price
  doc.setFontSize(11);
  doc.setTextColor(199, 93, 59); // #C75D3B
  doc.setFont(undefined, 'bold');
  const priceY = categoryY + 5;
  const price = formatCurrency(product.price || 0);
  doc.text(price, x + 5, priceY);
  
  // Stock indicator
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.setFont(undefined, 'normal');
  const stockY = priceY + 5;
  const stock = `Estoque: ${product.stock || 0} un`;
  doc.text(stock, x + 5, stockY);
  
  // Add border around the card
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 5, 5);
};

// Function to add cover page with product count
const addCoverPage = (doc, productCount) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Background gradient
  doc.setFillColor(248, 248, 248);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Header with brand colors
  doc.setFillColor(74, 59, 50); // #4A3B32
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  // Logo
  try {
    const logoWidth = 120;
    const logoHeight = 45;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 15;
    
    doc.addImage('/logostudio.PNG', 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (e) {
    console.log('Logo not found on cover');
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('Studio30 Closet', pageWidth / 2, 40, null, null, 'center');
  }
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('Catálogo Completo', pageWidth / 2, 70, null, null, 'center');
  
  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'normal');
  doc.text('Todos os nossos produtos em um só lugar', pageWidth / 2, 85, null, null, 'center');
  
  // Main content
  doc.setFontSize(16);
  doc.setTextColor(74, 59, 50); // #4A3B32
  doc.setFont(undefined, 'bold');
  doc.text('Catálogo de Produtos', pageWidth / 2, 130, null, null, 'center');
  
  doc.setFontSize(12);
  doc.setTextColor(128, 128, 128);
  doc.setFont(undefined, 'normal');
  doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 145, null, null, 'center');
  doc.text(`Total de produtos: ${productCount}`, pageWidth / 2, 155, null, null, 'center');
  
  // Decorative elements
  doc.setDrawColor(199, 93, 59); // #C75D3B
  doc.setLineWidth(1);
  doc.line(50, 170, pageWidth - 50, 170);
  
  // Footer text
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('Studio30 Closet - Sua curadoria de moda com a agilidade que suas clientes merecem.', pageWidth / 2, pageHeight - 40, null, null, 'center');
  doc.text('Contato: (XX) XXXXX-XXXX | Email: contato@studio30.com.br', pageWidth / 2, pageHeight - 30, null, null, 'center');
  
  // Add decorative corners
  doc.setFillColor(199, 93, 59, 10); // #C75D3B with opacity
  doc.circle(30, 30, 20);
  doc.circle(pageWidth - 30, 30, 20);
  doc.circle(30, pageHeight - 30, 20);
  doc.circle(pageWidth - 30, pageHeight - 30, 20);
};