#!/usr/bin/env node

// CLI para Web Scraper SEC-BA
// Oferece diferentes modos de execução

const fs = require('fs');
const path = require('path');

// Importar a classe do scraper
class ScraperSecBA {
  constructor(opcoes = {}) {
    this.baseUrl = 'http://www.sec.ba.gov.br/siig/sistemaescolar/asp/pesquisaEscola/pesquisaescola.asp';
    this.delay = opcoes.delay || 500;
    this.protocolo = opcoes.protocolo || 'http';
    this.timeout = opcoes.timeout || 15000;
    this.maxTentativas = opcoes.maxTentativas || 3;
  }

  carregarDadosUnidades(arquivo) {
    try {
      const dados = fs.readFileSync(arquivo, 'utf-8');
      const json = JSON.parse(dados);

      const ept = Array.isArray(json.ept) ? json.ept : [];
      const propedeutica = Array.isArray(json['Propedêutica'])
        ? json['Propedêutica']
        : (Array.isArray(json.propedeutica) ? json.propedeutica : []);

      const todasEscolas = [...ept, ...propedeutica];
      const mapa = new Map();

      for (const escola of todasEscolas) {
        const codSec = (escola.cod_sec || '').toString().trim();
        const codInep = (escola.cod_inep || '').toString().trim();
        const chave = `${codSec}::${codInep}`;

        if (!codSec && !codInep) continue;
        if (!mapa.has(chave)) {
          mapa.set(chave, escola);
        }
      }

      const escolas = Array.from(mapa.values());
      console.log(`✓ Carregadas ${escolas.length} escolas (${ept.length} EPT + ${propedeutica.length} Propedêutica) do arquivo ${arquivo}`);
      return escolas;
    } catch (erro) {
      console.error(`✗ Erro ao carregar arquivo: ${erro.message}`);
      return [];
    }
  }

  fazerRequisicao(dados, tentativa = 1) {
    return new Promise((resolve, reject) => {
      const querystring = require('querystring');
      const postData = querystring.stringify(dados);
      
      const protocolo = this.protocolo === 'https' ? require('https') : require('http');
      const porta = this.protocolo === 'https' ? 443 : 80;
      
      const opcoes = {
        hostname: 'www.sec.ba.gov.br',
        port: porta,
        path: '/siig/sistemaescolar/asp/pesquisaEscola/pesquisaescola.asp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Connection': 'keep-alive'
        },
        timeout: this.timeout
      };

      const req = protocolo.request(opcoes, (res) => {
        let html = '';
        res.on('data', (chunk) => { html += chunk; });
        res.on('end', () => { resolve(html); });
      });

      req.on('error', (erro) => {
        if (this.protocolo === 'https' && tentativa < 2) {
          this.protocolo = 'http';
          this.fazerRequisicao(dados, tentativa + 1).then(resolve).catch(reject);
        } else if (tentativa < this.maxTentativas) {
          setTimeout(() => {
            this.fazerRequisicao(dados, tentativa + 1).then(resolve).catch(reject);
          }, 1000 * tentativa);
        } else {
          reject(erro);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (tentativa < this.maxTentativas) {
          setTimeout(() => {
            this.fazerRequisicao(dados, tentativa + 1).then(resolve).catch(reject);
          }, 1000 * tentativa);
        } else {
          reject(new Error('Timeout'));
        }
      });

      req.write(postData);
      req.end();
    });
  }

  async buscarEscola(nomeEscola) {
    try {
      const dadosPost = {
        'txtNomeEscola': nomeEscola,
        'cmbNTE': '',
        'cmbPolo': '',
        'cmbMunicipio': '',
        'btnPesquisar': 'Pesquisar'
      };

      const html = await this.fazerRequisicao(dadosPost);
      await this.aguardar(this.delay);

      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const tabelas = document.querySelectorAll('table');

      if (tabelas.length < 2) {
        return {
          status: 'não encontrado',
          nome: nomeEscola,
          escolas: []
        };
      }

      return this.extrairDadosTabela(tabelas[1], nomeEscola);

    } catch (erro) {
      return {
        status: 'erro',
        nome: nomeEscola,
        mensagem: erro.message,
        escolas: []
      };
    }
  }

  extrairDadosTabela(tabela, nomeEscola) {
    try {
      const linhas = tabela.querySelectorAll('tr');

      if (linhas.length <= 1) {
        return {
          status: 'não encontrado',
          nome: nomeEscola,
          escolas: []
        };
      }

      const escolas = [];

      for (let i = 1; i < linhas.length; i++) {
        const colunas = linhas[i].querySelectorAll('td');

        if (colunas.length >= 6) {
          const escolaInfo = {
            codigo: colunas[0].textContent.trim(),
            nome_site: colunas[1].textContent.trim(),
            municipio: colunas[2].textContent.trim(),
            nte: colunas[3].textContent.trim(),
            polo: colunas[4].textContent.trim(),
            situacao: colunas[5]?.textContent.trim() || ''
          };

          const link = colunas[0].querySelector('a');
          if (link && link.href) {
            escolaInfo.link = link.href;
          }

          escolas.push(escolaInfo);
        }
      }

      return {
        status: escolas.length > 0 ? 'sucesso' : 'não encontrado',
        nome: nomeEscola,
        escolas: escolas
      };

    } catch (erro) {
      return {
        status: 'erro',
        nome: nomeEscola,
        mensagem: erro.message,
        escolas: []
      };
    }
  }

  aguardar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processarTodasEscolas(arquivoEntrada, arquivoSaida, opcoes = {}) {
    const limit = opcoes.limit || null;
    const escolas = this.carregarDadosUnidades(arquivoEntrada);

    if (escolas.length === 0) {
      console.error('✗ Nenhuma escola carregada');
      return;
    }

    const escolasProcessar = limit ? escolas.slice(0, limit) : escolas;

    const resultados = {
      timestamp: new Date().toISOString(),
      configuracao: {
        limit: limit || escolas.length,
        delay_ms: this.delay,
        protocolo: this.protocolo,
        timeout_ms: this.timeout
      },
      total_processadas: 0,
      total_encontradas: 0,
      total_erros: 0,
      escolas: []
    };

    console.log(`\n🤖 Iniciando processamento de ${escolasProcessar.length} escolas...`);
    if (limit) console.log(`   (modo teste: limitado a ${limit} escolas)\n`);

    const inicioTempo = Date.now();

    for (let idx = 0; idx < escolasProcessar.length; idx++) {
      const escola = escolasProcessar[idx];
      const nome = escola.nome || '';
      const percentual = Math.round((idx + 1) / escolasProcessar.length * 100);

      process.stdout.write(`\r[${idx + 1}/${escolasProcessar.length}] ${percentual}% - ${nome.substring(0, 50)}`);

      const resultado = await this.buscarEscola(nome);
      resultado.cod_inep = escola.cod_inep || '';
      resultado.cod_sec = escola.cod_sec || '';
      resultado.tipo_unidade = escola['TIPO DE UNIDADE'] || '';

      resultados.escolas.push(resultado);
      resultados.total_processadas += 1;

      if (resultado.status === 'sucesso') {
        resultados.total_encontradas += resultado.escolas.length;
      } else if (resultado.status === 'erro') {
        resultados.total_erros += 1;
      }
    }

    const tempoTotal = ((Date.now() - inicioTempo) / 1000).toFixed(2);
    resultados.tempo_segundos = parseFloat(tempoTotal);

    process.stdout.write('\r');
    console.log('\n');

    try {
      fs.writeFileSync(arquivoSaida, JSON.stringify(resultados, null, 2), 'utf-8');

      console.log('📊 Resumo:');
      console.log(`  • Total processadas: ${resultados.total_processadas}`);
      console.log(`  • Encontradas: ${resultados.total_encontradas}`);
      console.log(`  • Erros: ${resultados.total_erros}`);
      console.log(`  • Taxa de sucesso: ${((resultados.total_encontradas / resultados.total_processadas) * 100).toFixed(1)}%`);
      console.log(`  • Tempo total: ${tempoTotal}s`);
      console.log(`  • Tempo médio por escola: ${(parseFloat(tempoTotal) / resultados.total_processadas * 1000).toFixed(0)}ms`);
      console.log(`  • Arquivo de saída: ${arquivoSaida}`);
    } catch (erro) {
      console.error(`✗ Erro ao salvar: ${erro.message}`);
    }
  }
}

// ===== MAIN =====

const args = process.argv.slice(2);
const comando = args[0] || 'help';

const caminhoEntrada = path.join(__dirname, 'DadosUnidades.json');
const pastaData = path.join(__dirname, 'data');

// Criar pasta data se não existir
if (!fs.existsSync(pastaData)) {
  fs.mkdirSync(pastaData, { recursive: true });
}

const caminhoSaida = path.join(pastaData, 'ResultadosSEC.json');

const scraper = new ScraperSecBA({
  delay: 1500,
  protocolo: 'http'
});

switch (comando) {
  case 'scrape':
    console.log('🚀 Iniciando scraping completo...');
    scraper.processarTodasEscolas(caminhoEntrada, caminhoSaida);
    break;

  case 'test':
    const limite = parseInt(args[1]) || 10;
    console.log(`🧪 Modo teste (${limite} escolas)`);
    scraper.processarTodasEscolas(caminhoEntrada, caminhoSaida.replace('.json', '_teste.json'), { limit: limite });
    break;

  case 'buscar':
    if (!args[1]) {
      console.error('❌ Uso: node cli.js buscar "Nome da Escola"');
      process.exit(1);
    }
    const nomeEscola = args.slice(1).join(' ');
    console.log(`🔍 Buscando: ${nomeEscola}\n`);
    scraper.buscarEscola(nomeEscola).then(resultado => {
      console.log(JSON.stringify(resultado, null, 2));
    });
    break;

  case 'help':
  default:
    console.log(`
🤖 SEC-BA Web Scraper

Uso:
  node cli.js <comando> [opções]

Comandos:
  scrape              Executa o scraping completo (576 escolas)
  test [limite]       Executa em modo teste (padrão: 10 escolas)
  buscar <nome>       Busca uma escola específica pelo nome
  help                Mostra esta mensagem

Exemplos:
  node cli.js scrape
  node cli.js test 50
  node cli.js buscar "COLEGIO ESTADUAL SAO SEBASTIAO"
    `);
    break;
}
