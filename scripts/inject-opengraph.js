#!/usr/bin/env node
/*
 * ----------------------------------------------
 * inject-opengraph.js
 * ----------------------------------------------
 * Injeta metadados OpenGraph em todos os arquivos
 * .html dentro da pasta informada.
 *
 * USO
 *   node inject-opengraph.js ./public
 *
 * PRÉ‑REQUISITOS
 *   Variável de ambiente:
 *   - NEXT_PUBLIC_OPEN_GRAPH (JSON válido)
 *
 * REGRAS
 *   • Só altera arquivos que contenham </head>.
 *   • Ignora arquivos que já possuam og:title.
 *   • Gera resumo de execução ao final.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const inputDir = process.argv[2];
if (!inputDir) {
  console.error(
    '❌ Caminho da pasta não informado.\n   USO: node inject-opengraph.js ./public'
  );
  process.exit(1);
}

const root = path.resolve(inputDir);
if (!fs.existsSync(root)) {
  console.error(`❌ Pasta não encontrada: ${root}`);
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_OPEN_GRAPH) {
  console.error('ℹ️ Variável NEXT_PUBLIC_OPEN_GRAPH ausente.');
  process.exit(0);
}

let ogData;
try {
  ogData = JSON.parse(process.env.NEXT_PUBLIC_OPEN_GRAPH);
} catch {
  console.error('❌ NEXT_PUBLIC_OPEN_GRAPH não é JSON válido.');
  process.exit(1);
}

function buildOgTags(data) {
  const tags = [];
  if (data.title)
    tags.push(`<meta property="og:title" content="${data.title}">`);
  if (data.description)
    tags.push(`<meta property="og:description" content="${data.description}">`);
  if (data.type) tags.push(`<meta property="og:type" content="${data.type}">`);
  if (data.url) tags.push(`<meta property="og:url" content="${data.url}">`);
  if (data.site_name)
    tags.push(`<meta property="og:site_name" content="${data.site_name}">`);
  if (data.locale)
    tags.push(`<meta property="og:locale" content="${data.locale}">`);

  if (data.image?.url) {
    tags.push(`<meta property="og:image" content="${data.image.url}">`);
    if (data.image.width)
      tags.push(
        `<meta property="og:image:width" content="${data.image.width}">`
      );
    if (data.image.height)
      tags.push(
        `<meta property="og:image:height" content="${data.image.height}">`
      );
    if (data.image.alt)
      tags.push(`<meta property="og:image:alt" content="${data.image.alt}">`);
  }
  return tags.join('\n');
}

const ogMeta = buildOgTags(ogData);

let added = 0;
let skipped = 0;
let present = 0;

function injectOgInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('property="og:title"')) {
    console.log(`↪️  Já contém OpenGraph : ${filePath}`);
    present += 1;
    return;
  }

  const add = (mark) => {
    content = content.replace(mark, `${ogMeta}\n${mark}`);
    fs.writeFileSync(filePath, content);
    console.log(`✅ OpenGraph injetado   : ${filePath}`);
    added += 1;
  };

  if (content.includes('</head>')) {
    add('</head>');
  } else if (content.includes('</title>')) {
    add('<title>');
  } else {
    console.log(`⏭️  Ignorado (sem </head> e </title>): ${filePath}`);
    skipped += 1;
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (entry.endsWith('.html')) {
      injectOgInFile(fullPath);
    }
  }
}

console.log(`📂 Pasta alvo           : ${root}`);
walk(root);

console.log('\n📊 Resumo:');
console.log(`   • Injetados : ${added}`);
console.log(`   • Já tinha  : ${present}`);
console.log(`   • Ignorados : ${skipped}\n`);
