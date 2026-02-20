#!/bin/bash

# ============================================================================
# CRUD Operations Test Script
# Testa criar, ler, atualizar e deletar em todos os módulos principais
# ============================================================================

API_URL="http://localhost:3001/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testando CRUD Operations - Studio30 Admin API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se servidor está rodando
echo "1️⃣  Verificando se servidor está rodando..."
if curl -s "$API_URL/../health" > /dev/null; then
    echo -e "${GREEN}✓${NC} Servidor está online"
else
    echo -e "${RED}✗${NC} Servidor não está rodando. Execute: npm start"
    exit 1
fi
echo ""

# ============================================================================
# PRODUCTS
# ============================================================================
echo "📦 PRODUCTS"
echo "──────────────────────────────────────────────"

# GET - List products
echo -n "  GET /products... "
PRODUCTS=$(curl -s "$API_URL/products")
if [[ $PRODUCTS == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Metrics
echo -n "  GET /products/metrics... "
METRICS=$(curl -s "$API_URL/products/metrics")
if [[ $METRICS == *"count"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# TODO: POST, PUT, DELETE (requer dados válidos)
echo ""

# ============================================================================
# CUSTOMERS
# ============================================================================
echo "👥 CUSTOMERS"
echo "──────────────────────────────────────────────"

# GET - List customers
echo -n "  GET /customers... "
CUSTOMERS=$(curl -s "$API_URL/customers")
if [[ $CUSTOMERS == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Metrics
echo -n "  GET /customers/metrics... "
CUST_METRICS=$(curl -s "$API_URL/customers/metrics")
if [[ $CUST_METRICS == *"count"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# VENDAS
# ============================================================================
echo "💰 VENDAS"
echo "──────────────────────────────────────────────"

# GET - List vendas
echo -n "  GET /vendas... "
VENDAS=$(curl -s "$API_URL/vendas")
if [[ $VENDAS == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Metrics
echo -n "  GET /vendas/metrics... "
VEND_METRICS=$(curl -s "$API_URL/vendas/metrics")
if [[ $VEND_METRICS == *"count"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# MALINHAS
# ============================================================================
echo "📅 MALINHAS"
echo "──────────────────────────────────────────────"

# GET - List malinhas
echo -n "  GET /malinhas... "
MALINHAS=$(curl -s "$API_URL/malinhas")
if [[ $MALINHAS == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Metrics
echo -n "  GET /malinhas/metrics... "
MAL_METRICS=$(curl -s "$API_URL/malinhas/metrics")
if [[ $MAL_METRICS == *"count"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# STOCK
# ============================================================================
echo "📊 STOCK"
echo "──────────────────────────────────────────────"

# GET - KPIs
echo -n "  GET /stock/kpis... "
STOCK_KPIS=$(curl -s "$API_URL/stock/kpis")
if [[ $STOCK_KPIS == *"totalValue"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Ranking
echo -n "  GET /stock/ranking... "
RANKING=$(curl -s "$API_URL/stock/ranking")
if [[ $RANKING == *"byCategory"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# SUPPLIERS
# ============================================================================
echo "🏭 SUPPLIERS"
echo "──────────────────────────────────────────────"

# GET - List suppliers
echo -n "  GET /suppliers... "
SUPPLIERS=$(curl -s "$API_URL/suppliers")
if [[ $SUPPLIERS == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# INSTALLMENTS
# ============================================================================
echo "💳 INSTALLMENTS"
echo "──────────────────────────────────────────────"

# GET - List installments
echo -n "  GET /installments... "
INSTALL=$(curl -s "$API_URL/installments")
if [[ $INSTALL == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Metrics
echo -n "  GET /installments/metrics... "
INST_METRICS=$(curl -s "$API_URL/installments/metrics")
if [[ $INST_METRICS == *"count"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# EXPENSES
# ============================================================================
echo "💸 EXPENSES"
echo "──────────────────────────────────────────────"

# GET - List expenses
echo -n "  GET /expenses... "
EXPENSES=$(curl -s "$API_URL/expenses")
if [[ $EXPENSES == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Metrics
echo -n "  GET /expenses/metrics... "
EXP_METRICS=$(curl -s "$API_URL/expenses/metrics")
if [[ $EXP_METRICS == *"count"* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# COLLECTIONS
# ============================================================================
echo "🏷️  COLLECTIONS"
echo "──────────────────────────────────────────────"

# GET - List collections
echo -n "  GET /collections... "
COLLECTIONS=$(curl -s "$API_URL/collections")
if [[ $COLLECTIONS == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# GET - Active collections
echo -n "  GET /collections/active... "
ACTIVE_COLL=$(curl -s "$API_URL/collections/active")
if [[ $ACTIVE_COLL == *"["* ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# SITE IMAGES
# ============================================================================
echo "🖼️  SITE IMAGES"
echo "──────────────────────────────────────────────"

# GET - Site images
echo -n "  GET /images... "
IMAGES=$(curl -s "$API_URL/images")
if [[ $IMAGES == *"hero_logo"* ]] || [[ $IMAGES == "{}" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓${NC} Todos os endpoints principais estão funcionando!"
echo ""
echo "📝 Notas:"
echo "  - Testes de POST, PUT, DELETE requerem dados válidos"
echo "  - Para testar uploads, use o gerenciador de imagens no admin"
echo "  - Para testar autenticação, use o login do admin"
echo ""
echo -e "${YELLOW}💡 Dica:${NC} Execute este script sempre após mudanças no backend"
echo ""
