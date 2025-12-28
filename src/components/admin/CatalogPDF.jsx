import React from 'react';

export const CatalogPDF = ({ products }) => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', width: '210mm' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Catálogo de Produtos</h1>
      {products.map((product, index) => (
        <div key={product.id} style={{
          pageBreakInside: 'avoid',
          marginBottom: '20px',
          borderBottom: index < products.length - 1 ? '1px solid #eee' : 'none',
          paddingBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{product.name}</h2>
          <p style={{ fontSize: '16px', color: '#C75D3B', fontWeight: 'bold' }}>
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginTop: '10px' }}>
            {product.images && product.images.map((image, i) => (
              <img key={i} src={image} alt={`${product.name} - Imagem ${i + 1}`} style={{ width: '100%', height: 'auto', borderRadius: '8px' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
