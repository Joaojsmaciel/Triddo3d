import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const htaccessSource = join(process.cwd(), '.htaccess');
const htaccessDest = join(process.cwd(), 'dist', '.htaccess');

if (existsSync(htaccessSource)) {
  try {
    copyFileSync(htaccessSource, htaccessDest);
    console.log('✅ Arquivo .htaccess copiado para dist/ com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao copiar .htaccess:', error.message);
    process.exit(1);
  }
} else {
  console.warn('⚠️  Arquivo .htaccess não encontrado na raiz do projeto');
}

