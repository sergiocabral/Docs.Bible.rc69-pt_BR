#!/usr/bin/env node
/*
 * ----------------------------------------------
 * antora-factory-include.js
 * ----------------------------------------------
 * Substitui blocos `:include: ...` em arquivos nav.adoc
 * pelo conteúdo real da URL (se for http) ou arquivo local (se for caminho).
 *
 * USO:
 *   node antora-factory-include.js <pasta-base>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const baseDir = process.argv[2];
if (!baseDir) {
  console.error(
    '❌ Erro: informe a pasta base como argumento (ex: antora/components)'
  );
  process.exit(1);
}
const absBase = path.resolve(baseDir);
if (!fs.existsSync(absBase)) {
  console.error(`❌ Erro: pasta não encontrada: ${absBase}`);
  process.exit(1);
}

console.log(`📂 Pasta base: ${absBase}`);

function fetchContent(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(
            new Error(`Erro HTTP ${res.statusCode} ao acessar ${url}`)
          );
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function processFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.adoc')) {
      console.log(`📝 Processando: ${fullPath}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      let modified = false;
      const result = [];

      for (const line of lines) {
        const match = line.match(/^:include: (.+)$/);
        if (match) {
          const target = match[1];

          try {
            let fetched;

            if (target.startsWith('http://') || target.startsWith('https://')) {
              console.log(`🌐 Buscando conteúdo remoto: ${target}`);
              fetched = await fetchContent(target);
            } else {
              const localPath = path.resolve(process.cwd(), target);
              console.log(`📄 Lendo arquivo local: ${localPath}`);
              if (!fs.existsSync(localPath))
                throw new Error('Arquivo local não encontrado.');
              fetched = fs.readFileSync(localPath, 'utf8');
            }

            result.push(fetched.trimEnd());
            modified = true;
          } catch (err) {
            console.error(`❌ Erro ao incluir "${target}":\n${err.message}`);
            process.exit(1);
          }
        } else {
          result.push(line);
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, result.join('\n'), 'utf8');
        console.log(`✅ Atualizado com sucesso: ${fullPath}\n`);
      } else {
        console.log(`⏭️  Nenhum xinclude encontrado.\n`);
      }
    }
  }
}

processFiles(absBase)
  .then(() => console.log('🚀 Inclusões concluídas.'))
  .catch((err) => {
    console.error('❌ Erro inesperado:\n', err);
    process.exit(1);
  });
