#!/usr/bin/env node

// Scraper de Servidores - Abordagem simplificada
// Tenta acessar endpoints específicos de dados

const fs = require('fs');
const path = require('path');
const http = require('http');

class ScraperServidoresSimples {
  constructor() {
    this.baseUrl = 'http://www.sec.ba.gov.br/siig/sistemaescolar';
    this.timeout = 15000;
  }

  carregarDadosUnidades(arquivo) {
    try {
      const dados = fs.readFileSync(arquivo, 'utf-8');
      const json = JSON.parse(dados);
      const escolas = json.ept || [];
      console.log(`✓ Carregadas ${escolas.length} escolas`);
      return escolas;
    } catch (erro) {
      console.error(`✗ Erro: ${erro.message}`);
      return [];
    }
  }

  fazerRequisicao(url, tentativa = 1) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const opcoes = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/json'
        },
        timeout: this.timeout
      };

      const req = http.request(opcoes, (res) => {
        let dados = '';
        res.on('data', (chunk) => { dados += chunk; });
        res.on('end', () => { resolve({ status: res.statusCode, dados }); });
      });

      req.on('error', (erro) => {
        if (tentativa < 2) {
          setTimeout(() => {
            this.fazerRequisicao(url, tentativa + 1).then(resolve).catch(reject);
          }, 500);
        } else {
          reject(erro);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });
  }

  async buscarServidoresViaAPI(codigoMEC, codigoSEC, nomeEscola) {
    const urls = [
      // Tenta diferentes endpoints possíveis
      `${this.baseUrl}/asp/api/servidores.asp?codigo_mec=${codigoMEC}&codigo_sec=${codigoSEC}`,
      `${this.baseUrl}/asp/api/servidores.json?codigo_mec=${codigoMEC}`,
      `${this.baseUrl}/asp/ajax/servidores.asp?cod=${codigoMEC}`,
      `${this.baseUrl}/asp/principal/listar_dados.asp?cod=&tipo=16&cod_sia=`,
    ];

    let sucesso = false;
    let servidores = [];

    for (const url of urls) {
      try {
        const { status, dados } = await this.fazerRequisicao(url);
        
        if (status === 200 && dados.length > 100) {
          // Tentou fazer parse como JSON
          try {
            const json = JSON.parse(dados);
            if (json.servidores || Array.isArray(json)) {
              servidores = Array.isArray(json) ? json : json.servidores;
              sucesso = true;
              break;
            }
          } catch (e) {
            // Não é JSON, mas pode conter tabelas HTML
            if (dados.includes('tr') && dados.includes('td')) {
              sucesso = true;
              break;
            }
          }
        }
      } catch (erro) {
        continue;
      }
    }

    return {
      status: sucesso ? 'parcial' : 'não encontrado',
      nome_escola: nomeEscola,
      codigo_mec: codigoMEC,
      codigo_sec: codigoSEC,
      servidores: servidores,
      nota: 'Dados de servidores requerem JavaScript para carregamento dinâmico'
    };
  }

  async processarTodasEscolas(arquivoEntrada, arquivoSaida, limite = 3) {
    const escolas = this.carregarDadosUnidades(arquivoEntrada);

    if (escolas.length === 0) return;

    const escolasProcessar = escolas.slice(0, limite);
    const resultados = {
      timestamp: new Date().toISOString(),
      mensagem: 'Os dados de servidores são carregados dinamicamente via JavaScript. Para scraping completo, use Puppeteer ou Playwright.',
      total_processadas: 0,
      escolas: []
    };

    console.log(`\n📌 Testando ${escolasProcessar.length} escolas...\n`);

    for (let idx = 0; idx < escolasProcessar.length; idx++) {
      const escola = escolasProcessar[idx];
      process.stdout.write(`\r[${idx + 1}/${escolasProcessar.length}] ${escola.nome.substring(0, 50)}`);

      const resultado = await this.buscarServidoresViaAPI(
        escola.cod_inep,
        escola.cod_sec,
        escola.nome
      );
      resultados.escolas.push(resultado);
      resultados.total_processadas++;
    }

    process.stdout.write('\r');
    console.log('\n');

    fs.writeFileSync(arquivoSaida, JSON.stringify(resultados, null, 2), 'utf-8');
    console.log(`✅ Resultado salvo: ${arquivoSaida}`);
  }
}

// Main
const scraper = new ScraperServidoresSimples();
const entrada = path.join(__dirname, 'DadosUnidades.json');
const saida = path.join(__dirname, 'ServidoresSecBA_info.json');

scraper.processarTodasEscolas(entrada, saida, 3);
