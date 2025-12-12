#!/bin/bash

echo "========================================"
echo "  Build e Preparação para InfinityFree"
echo "========================================"
echo ""

echo "[1/3] Instalando dependências..."
npm install
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências"
    exit 1
fi

echo ""
echo "[2/3] Criando build de produção..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao criar build"
    exit 1
fi

echo ""
echo "[3/3] Copiando arquivo .htaccess..."
if [ -f .htaccess ]; then
    cp .htaccess dist/.htaccess
    echo "Arquivo .htaccess copiado com sucesso!"
else
    echo "AVISO: Arquivo .htaccess não encontrado"
fi

echo ""
echo "========================================"
echo "  Build concluído com sucesso!"
echo "========================================"
echo ""
echo "Os arquivos estão na pasta: dist/"
echo ""
echo "Próximos passos:"
echo "1. Acesse o File Manager do InfinityFree"
echo "2. Entre na pasta htdocs ou public_html"
echo "3. Faça upload de TODOS os arquivos da pasta dist"
echo ""

