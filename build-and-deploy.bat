@echo off
echo ========================================
echo   Build e Preparacao para InfinityFree
echo ========================================
echo.

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo [2/3] Criando build de producao...
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao criar build
    pause
    exit /b 1
)

echo.
echo [3/3] Copiando arquivo .htaccess...
if exist .htaccess (
    copy .htaccess dist\.htaccess >nul
    echo Arquivo .htaccess copiado com sucesso!
) else (
    echo AVISO: Arquivo .htaccess nao encontrado
)

echo.
echo ========================================
echo   Build concluido com sucesso!
echo ========================================
echo.
echo Localizacao da pasta dist:
echo %CD%\dist
echo.
echo IMPORTANTE: Faca upload dos ARQUIVOS DENTRO da pasta dist
echo (NAO faca upload da pasta dist em si, apenas seu conteudo)
echo.
echo Proximos passos:
echo 1. Acesse o File Manager do InfinityFree
echo 2. Entre na pasta htdocs ou public_html
echo 3. Selecione TODOS os arquivos e pastas DENTRO de dist\
echo    (exemplo: index.html, assets\, .htaccess, etc)
echo 4. Faca upload desses arquivos para htdocs/public_html
echo.
echo Estrutura esperada no servidor:
echo htdocs/
echo   - index.html
echo   - assets/
echo   - .htaccess
echo   (e outros arquivos gerados)
echo.
pause

