#!/usr/bin/env node

// Debug Servidores - Salva HTML de uma escola para análise

const http = require('http');
const fs = require('fs');

function fazerRequisicao(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const opcoes = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    const req = http.request(opcoes, (res) => {
      let html = '';
      res.on('data', (chunk) => { html += chunk; });
      res.on('end', () => { resolve(html); });
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const url = 'http://www.sec.ba.gov.br/siig/sistemaescolar/asp/principal/consulta_escola.asp?codigo_mec=29057809&codigo_secretaria=1125747&SeqAnexo=0';
    
    console.log('🔍 Buscando página de servidores...\n');
    const html = await fazerRequisicao(url);
    
    // Salvar HTML completo
    fs.writeFileSync('debug_servidores.html', html, 'utf-8');
    console.log(`✓ HTML completo salvo: debug_servidores.html (${html.length} caracteres)`);
    
    // Procurar por padrões específicos
    console.log('\n📊 Análise:');
    
    if (html.includes('<table')) {
      const tableCount = (html.match(/<table/gi) || []).length;
      console.log(`✓ Encontradas ${tableCount} tabelas`);
    }
    
    if (html.includes('matrícula') || html.includes('Matrícula') || html.includes('MATRÍCULA')) {
      console.log('✓ Encontrado: "Matrícula"');
    } else {
      console.log('✗ Não encontrado: "Matrícula"');
    }
    
    if (html.includes('Servidores') || html.includes('servidores') || html.includes('SERVIDORES')) {
      console.log('✓ Encontrado: "Servidores"');
      const match = html.match(/Servidores/gi);
      console.log(`  (mencionado ${match.length} vezes)`);
    } else {
      console.log('✗ Não encontrado: "Servidores"');
    }
    
    // Procurar por nomes conhecidos
    if (html.includes('LUCAS BORGES') || html.includes('AURIVAN') || html.includes('MARIA LUCIA')) {
      console.log('✓ Encontrados dados de servidores conhecidos');
    } else {
      console.log('✗ Não encontrados dados de servidores conhecidos');
    }
    
    // Procurar por estrutura de tabela
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
    if (tableMatch) {
      console.log(`\n✓ Encontradas ${tableMatch.length} estruturas de tabela completa`);
    }
    
    // Procurar por ID de tabela específico
    if (html.includes('id="') || html.includes("id='")) {
      console.log('✓ Encontrados elementos com ID');
    }
    
    console.log('\n💡 Próximo passo: Analise o arquivo debug_servidores.html');
    
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
  }
})();
