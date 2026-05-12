#!/usr/bin/env node

// Scraper com Puppeteer - Executa JavaScript para carregar dados de servidores

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class ScraperServidoresComPuppeteer {
  constructor() {
    this.timeout = 30000;
  }

  /**
   * Carrega o arquivo JSON com dados das unidades
   */
  carregarDadosUnidades(arquivo) {
    try {
      const dados = fs.readFileSync(arquivo, 'utf-8');
      const json = JSON.parse(dados);
      const escolas = json.ept || [];
      console.log(`✓ Carregadas ${escolas.length} escolas do arquivo ${arquivo}`);
      return escolas;
    } catch (erro) {
      console.error(`✗ Erro ao carregar arquivo: ${erro.message}`);
      return [];
    }
  }

  /**
   * Busca servidores de uma escola usando Puppeteer
   */
  async buscarServidores(codigoMEC, codigoSEC, nomeEscola, browser) {
    const page = await browser.newPage();
    
    try {
      // Acessar a página de consulta da escola
      const url = `http://www.sec.ba.gov.br/siig/sistemaescolar/asp/principal/consulta_escola.asp?codigo_mec=${codigoMEC}&codigo_secretaria=${codigoSEC}&SeqAnexo=0`;
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.timeout });
      
      // Aguardar um pouco para o JavaScript carregar
      await page.waitForTimeout(1000);
      
      // Simular clique na aba "Servidores" (tab16)
      await page.evaluate(() => {
        if (typeof tab16_on === 'function') {
          tab16_on();
        }
      });
      
      // Aguardar mais um pouco para os dados carregarem no iframe
      await page.waitForTimeout(2000);
      
      // Tentar extrair dados da tabela de servidores
      const servidores = await page.evaluate(() => {
        const resultados = [];
        
        // Procurar por qualquer tabela que possa conter dados
        const tabelas = document.querySelectorAll('table');
        
        for (let tabela of tabelas) {
          const linhas = tabela.querySelectorAll('tr');
          
          for (let i = 1; i < linhas.length; i++) {
            const colunas = linhas[i].querySelectorAll('td');
            
            if (colunas.length >= 3) {
              const texto = Array.from(colunas).map(c => c.textContent.trim()).join('|');
              
              // Procurar por padrão que indique servidor (matrícula, nome, cargo)
              if (texto.length > 10 && !texto.includes('--')) {
                resultados.push({
                  matricula: colunas[0]?.textContent.trim() || '',
                  nome: colunas[1]?.textContent.trim() || '',
                  cargo: colunas[2]?.textContent.trim() || '',
                  data_designacao: colunas[3]?.textContent.trim() || '',
                  numero_portaria: colunas[4]?.textContent.trim() || '',
                  data_portaria: colunas[5]?.textContent.trim() || ''
                });
              }
            }
          }
        }
        
        return resultados;
      });
      
      return {
        status: 'sucesso',
        nome_escola: nomeEscola,
        codigo_mec: codigoMEC,
        codigo_sec: codigoSEC,
        total_servidores: servidores.length,
        servidores: servidores
      };
      
    } catch (erro) {
      console.error(`✗ Erro ao processar "${nomeEscola}": ${erro.message}`);
      return {
        status: 'erro',
        nome_escola: nomeEscola,
        codigo_mec: codigoMEC,
        codigo_sec: codigoSEC,
        mensagem: erro.message,
        total_servidores: 0,
        servidores: []
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Processa todas as escolas do arquivo JSON
   */
  async processarTodasEscolas(arquivoEntrada, arquivoSaida, opcoes = {}) {
    const limit = opcoes.limit || null;
    const escolas = this.carregarDadosUnidades(arquivoEntrada);

    if (escolas.length === 0) {
      console.error('✗ Nenhuma escola carregada para processar');
      return;
    }

    const escolasProcessar = limit ? escolas.slice(0, limit) : escolas;

    // Iniciar Puppeteer
    let browser;
    try {
      console.log('\n🌐 Iniciando navegador...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (erro) {
      console.error('❌ Erro ao iniciar Puppeteer:', erro.message);
      console.log('💡 Certifique-se que Puppeteer foi instalado: npm install puppeteer');
      return;
    }

    const resultados = {
      timestamp: new Date().toISOString(),
      configuracao: {
        total_escolas: escolasProcessar.length,
        metodo: 'Puppeteer (executa JavaScript)'
      },
      resumo: {
        total_processadas: 0,
        total_com_servidores: 0,
        total_erros: 0,
        total_servidores: 0
      },
      escolas: []
    };

    console.log(`\n🤖 Iniciando coleta com ${escolasProcessar.length} escolas...\n`);
    if (limit) console.log(`   (modo teste: limitado a ${limit} escolas)\n`);

    const inicioTempo = Date.now();

    for (let idx = 0; idx < escolasProcessar.length; idx++) {
      const escola = escolasProcessar[idx];
      const nome = escola.nome || '';
      const codMEC = escola.cod_inep || '';
      const codSEC = escola.cod_sec || '';
      const percentual = Math.round((idx + 1) / escolasProcessar.length * 100);

      process.stdout.write(`\r[${idx + 1}/${escolasProcessar.length}] ${percentual}% - ${nome.substring(0, 50)}`);

      const resultado = await this.buscarServidores(codMEC, codSEC, nome, browser);
      resultados.escolas.push(resultado);
      resultados.resumo.total_processadas += 1;

      if (resultado.status === 'sucesso' && resultado.total_servidores > 0) {
        resultados.resumo.total_com_servidores += 1;
        resultados.resumo.total_servidores += resultado.total_servidores;
      } else if (resultado.status === 'erro') {
        resultados.resumo.total_erros += 1;
      }
    }

    const tempoTotal = ((Date.now() - inicioTempo) / 1000).toFixed(2);
    resultados.tempo_segundos = parseFloat(tempoTotal);

    process.stdout.write('\r');
    console.log('\n');

    // Fechar navegador
    await browser.close();

    try {
      fs.writeFileSync(arquivoSaida, JSON.stringify(resultados, null, 2), 'utf-8');

      console.log('📊 Resumo:');
      console.log(`  • Total de escolas processadas: ${resultados.resumo.total_processadas}`);
      console.log(`  • Escolas com servidores: ${resultados.resumo.total_com_servidores}`);
      console.log(`  • Total de erros: ${resultados.resumo.total_erros}`);
      console.log(`  • Total de servidores: ${resultados.resumo.total_servidores}`);
      if (resultados.resumo.total_com_servidores > 0) {
        console.log(`  • Média: ${(resultados.resumo.total_servidores / resultados.resumo.total_com_servidores).toFixed(1)} servidores/escola`);
      }
      console.log(`  • Tempo total: ${tempoTotal}s`);
      console.log(`\n✅ Resultados salvos em: ${arquivoSaida}`);
    } catch (erro) {
      console.error(`✗ Erro ao salvar: ${erro.message}`);
    }
  }
}

// ===== MAIN =====

const args = process.argv.slice(2);
const comando = args[0] || 'help';

const caminhoEntrada = path.join(__dirname, 'DadosUnidades.json');
const caminhoSaida = path.join(__dirname, 'ServidoresSecBA_Puppeteer.json');

const scraper = new ScraperServidoresComPuppeteer();

switch (comando) {
  case 'test':
    const limite = parseInt(args[1]) || 2;
    console.log(`🧪 Modo teste (${limite} escolas com Puppeteer)`);
    scraper.processarTodasEscolas(caminhoEntrada, caminhoSaida.replace('.json', '_teste.json'), { limit: limite });
    break;

  case 'help':
  default:
    console.log(`
🤖 SEC-BA Servidores Scraper (com Puppeteer)

Extrai dados de servidores executando JavaScript no navegador

Uso:
  node scraper_servidores_puppeteer.js test [limite]
  
Exemplo:
  node scraper_servidores_puppeteer.js test 5

Dependências:
  npm install puppeteer
    `);
    break;
}
