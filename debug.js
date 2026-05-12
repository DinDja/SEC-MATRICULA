#!/usr/bin/env node

// Script de debug para analisar resposta do servidor SEC-BA

const http = require('http');
const querystring = require('querystring');

function fazerRequisicao(nomeEscola) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      'txtNomeEscola': nomeEscola,
      'cmbNTE': '',
      'cmbPolo': '',
      'cmbMunicipio': '',
      'btnPesquisar': 'Pesquisar'
    });

    const opcoes = {
      hostname: 'www.sec.ba.gov.br',
      port: 80,
      path: '/siig/sistemaescolar/asp/pesquisaEscola/pesquisaescola.asp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    const req = http.request(opcoes, (res) => {
      let html = '';
      res.on('data', (chunk) => { html += chunk; });
      res.on('end', () => { resolve(html); });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    console.log('🔍 Enviando requisição para o site SEC-BA...\n');
    const nomeEscola = 'COLEGIO ESTADUAL SAO SEBASTIAO';
    console.log(`Nome da escola: "${nomeEscola}"\n`);
    
    const html = await fazerRequisicao(nomeEscola);
    
    console.log('📄 Resposta recebida:');
    console.log('═'.repeat(80));
    
    // Mostrar primeiro 3000 caracteres
    console.log(html.substring(0, 3000));
    console.log('\n' + '═'.repeat(80));
    console.log(`\nTotal de caracteres na resposta: ${html.length}`);
    
    // Procurar por indicadores específicos
    console.log('\n📊 Análise:');
    if (html.includes('<table')) {
      console.log('✓ Encontrado: elementos <table>');
    } else {
      console.log('✗ Não encontrado: elementos <table>');
    }
    
    if (html.includes('Pesquisar')) {
      console.log('✓ Encontrado: formulário de pesquisa');
    }
    
    if (html.includes('resultado') || html.includes('Resultado') || html.includes('RESULTADO')) {
      console.log('✓ Encontrado: menção a "resultado"');
    }
    
    // Salvar em arquivo para análise
    require('fs').writeFileSync('debug_response.html', html, 'utf-8');
    console.log('\n💾 Resposta completa salva em: debug_response.html');
    
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
  }
})();
