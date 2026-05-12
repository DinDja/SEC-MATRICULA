#!/usr/bin/env node

// Web Scraper para Servidores de Escolas SEC-BA
// Extrai dados de funcionários/servidores de cada escola

const fs = require('fs');
const path = require('path');
const http = require('http');
const querystring = require('querystring');
const { JSDOM } = require('jsdom');

class ScraperServidoresSecBA {
  constructor(opcoes = {}) {
    this.baseUrl = 'http://www.sec.ba.gov.br/siig/sistemaescolar/asp/principal/consulta_escola.asp';
    this.servidoresUrl = 'http://www.sec.ba.gov.br/siig/sistemaescolar/asp/servidores/listar_servidores_nominal.asp';
    this.delay = opcoes.delay || 1500; // Delay entre requisições (ms) - aumentado para permitir carregamento de servidores
    this.timeout = opcoes.timeout || 30000; // Timeout aumentado para dados dinâmicos
    this.maxTentativas = opcoes.maxTentativas || 2;
  }

  /**
   * Carrega o arquivo JSON com dados das unidades
   */
  carregarDadosUnidades(arquivo) {
    try {
      const dados = fs.readFileSync(arquivo, 'utf-8');
      const json = JSON.parse(dados);

      const ept = Array.isArray(json.ept) ? json.ept : [];
      const propedeutica = Array.isArray(json['Propedêutica'])
        ? json['Propedêutica']
        : (Array.isArray(json.propedeutica) ? json.propedeutica : []);

      const todasEscolas = [...ept, ...propedeutica];

      // Remove duplicidades por cod_sec+cod_inep (quando ambos existirem)
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
      console.log(
        `✓ Carregadas ${escolas.length} escolas (${ept.length} EPT + ${propedeutica.length} Propedêutica) do arquivo ${arquivo}`
      );
      return escolas;
    } catch (erro) {
      console.error(`✗ Erro ao carregar arquivo: ${erro.message}`);
      return [];
    }
  }

  /**
   * Faz requisição HTTP GET
   */
  fazerRequisicao(url, tentativa = 1) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const opcoes = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Connection': 'keep-alive',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: this.timeout
      };

      const req = http.request(opcoes, (res) => {
        let html = '';
        res.on('data', (chunk) => { html += chunk; });
        res.on('end', () => { resolve(html); });
      });

      req.on('error', (erro) => {
        if (tentativa < this.maxTentativas) {
          console.log(`  ⟳ Tentativa ${tentativa + 1}/${this.maxTentativas}...`);
          setTimeout(() => {
            this.fazerRequisicao(url, tentativa + 1).then(resolve).catch(reject);
          }, 1000 * tentativa);
        } else {
          reject(erro);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (tentativa < this.maxTentativas) {
          console.log(`  ⟳ Timeout, tentativa ${tentativa + 1}/${this.maxTentativas}...`);
          setTimeout(() => {
            this.fazerRequisicao(url, tentativa + 1).then(resolve).catch(reject);
          }, 1000 * tentativa);
        } else {
          reject(new Error('Timeout'));
        }
      });

      req.end();
    });
  }

  /**
   * Faz requisição HTTP POST (form-urlencoded)
   */
  fazerRequisicaoPost(url, dadosPost, tentativa = 1) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const postData = querystring.stringify(dadosPost || {});

      const opcoes = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Connection': 'keep-alive',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.timeout
      };

      const req = http.request(opcoes, (res) => {
        let html = '';
        res.on('data', (chunk) => { html += chunk; });
        res.on('end', () => { resolve(html); });
      });

      req.on('error', (erro) => {
        if (tentativa < this.maxTentativas) {
          console.log(`  ⟳ Tentativa POST ${tentativa + 1}/${this.maxTentativas}...`);
          setTimeout(() => {
            this.fazerRequisicaoPost(url, dadosPost, tentativa + 1).then(resolve).catch(reject);
          }, 1000 * tentativa);
        } else {
          reject(erro);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (tentativa < this.maxTentativas) {
          console.log(`  ⟳ Timeout POST, tentativa ${tentativa + 1}/${this.maxTentativas}...`);
          setTimeout(() => {
            this.fazerRequisicaoPost(url, dadosPost, tentativa + 1).then(resolve).catch(reject);
          }, 1000 * tentativa);
        } else {
          reject(new Error('Timeout'));
        }
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Serializa todos os campos do formulário da escola
   */
  extrairCamposFormulario(document, codigoMEC, codigoSEC) {
    const dados = {};
    const form = document.querySelector('form[name="FormEscola"], form#escola');

    if (!form) {
      return {
        codigo_escola: codigoMEC,
        codigo_secretaria: codigoSEC,
        SeqAnexo: '00'
      };
    }

    const elementos = form.querySelectorAll('input[name], select[name], textarea[name]');
    elementos.forEach((el) => {
      const nome = el.getAttribute('name');
      if (!nome) return;

      if (el.tagName.toLowerCase() === 'select') {
        const selecionado = el.options[el.selectedIndex] || el.options[0];
        dados[nome] = selecionado ? (selecionado.value || '').trim() : '';
      } else {
        dados[nome] = (el.value || '').trim();
      }
    });

    dados.codigo_escola = codigoMEC;
    dados.codigo_secretaria = codigoSEC;

    if (!dados.SeqAnexo) {
      dados.SeqAnexo = '00';
    }

    return dados;
  }

  /**
   * Extrai servidores a partir do HTML da aba de servidores
   */
  extrairServidoresDoHtml(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const tabelas = document.querySelectorAll('table');
    const servidores = [];

    for (const tabela of tabelas) {
      const linhas = tabela.querySelectorAll('tr');
      if (linhas.length < 2) continue;

      const headerCells = linhas[0].querySelectorAll('td, th');
      const headerText = Array.from(headerCells)
        .map((cell) => cell.textContent.trim().toLowerCase())
        .join('|');

      const ehTabelaServidores =
        ((headerText.includes('matr') || headerText.includes('cadastro')) &&
          headerText.includes('nome') &&
          (headerText.includes('cargo') || headerText.includes('fun')));

      if (!ehTabelaServidores) continue;

      for (let i = 1; i < linhas.length; i++) {
        const colunas = linhas[i].querySelectorAll('td');
        if (colunas.length < 3) continue;

        const cargoBruto = colunas[2]?.textContent.trim() || '';
        const servidor = {
          matricula: (colunas[0]?.textContent || '').replace(/\u00a0/g, ' ').trim(),
          nome: (colunas[1]?.textContent || '').replace(/\u00a0/g, ' ').trim(),
          cargo: cargoBruto.replace(/^FUN..O:\s*/i, '').replace(/\u00a0/g, ' ').trim(),
          funcao: (colunas[3]?.textContent || '').replace(/\u00a0/g, ' ').trim(),
          nivel: (colunas[4]?.textContent || '').replace(/\u00a0/g, ' ').trim(),
          situacao: (colunas[5]?.textContent || '').replace(/\u00a0/g, ' ').trim(),
          certificados: (colunas[6]?.textContent || '').replace(/\u00a0/g, ' ').trim()
        };

        if (servidor.nome && servidor.nome.length > 2) {
          servidores.push(servidor);
        }
      }
    }

    return servidores;
  }

  /**
   * Busca servidores de uma escola
   */
  async buscarServidores(codigoMEC, codigoSEC, nomeEscola) {
    try {
      // Construir URL de consulta
      const url = `${this.baseUrl}?codigo_mec=${codigoMEC}&codigo_secretaria=${codigoSEC}&SeqAnexo=0`;

      // 1) Carrega página principal da escola para obter campos/hidden necessários
      const htmlConsulta = await this.fazerRequisicao(url);
      await this.aguardar(this.delay);

      const dom = new JSDOM(htmlConsulta);
      const document = dom.window.document;
      const dadosForm = this.extrairCamposFormulario(document, codigoMEC, codigoSEC);

      // 2) Reproduz a chamada da aba Servidores: ../servidores/listar_servidores_nominal.asp
      const htmlServidores = await this.fazerRequisicaoPost(this.servidoresUrl, dadosForm);
      await this.aguardar(this.delay);

      const servidores = this.extrairServidoresDoHtml(htmlServidores);

      return {
        status: 'sucesso',
        nome_escola: nomeEscola,
        codigo_mec: codigoMEC,
        codigo_sec: codigoSEC,
        total_servidores: servidores.length,
        servidores: servidores
      };

    } catch (erro) {
      console.error(`✗ Erro ao buscar servidores de "${nomeEscola}": ${erro.message}`);
      return {
        status: 'erro',
        nome_escola: nomeEscola,
        codigo_mec: codigoMEC,
        codigo_sec: codigoSEC,
        mensagem: erro.message,
        total_servidores: 0,
        servidores: []
      };
    }
  }

  /**
   * Aguarda por um período de tempo
   */
  aguardar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Carrega arquivo de progresso (checkpoint)
   */
  carregarProgresso(arquivo) {
    if (fs.existsSync(arquivo)) {
      try {
        return JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
      } catch (e) {
        console.error(`⚠ Erro ao carregar progresso: ${e.message}`);
      }
    }
    return {
      lastIndex: -1,
      totalProcessadas: 0,
      totalComServidores: 0,
      totalErros: 0,
      totalServidores: 0,
      startedAt: new Date().toISOString(),
      resumedAt: null
    };
  }

  /**
   * Salva arquivo de progresso (checkpoint)
   */
  salvarProgresso(arquivo, dados) {
    fs.writeFileSync(
      arquivo,
      JSON.stringify({ ...dados, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  }

  /**
   * Adiciona um registro ao arquivo JSONL
   */
  adicionarRegistroJSONL(arquivo, registro) {
    fs.appendFileSync(arquivo, JSON.stringify(registro) + '\n', 'utf-8');
  }

  /**
   * Lê todos os registros de um arquivo JSONL
   */
  lerJsonl(arquivo) {
    if (!fs.existsSync(arquivo)) return [];
    return fs
      .readFileSync(arquivo, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((linha) => {
        try {
          return JSON.parse(linha);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Processa todas as escolas do arquivo JSON com checkpoint/resume
   */
  async processarTodasEscolas(arquivoEntrada, arquivoSaida, opcoes = {}) {
    const limit = opcoes.limit || null;
    const escolas = this.carregarDadosUnidades(arquivoEntrada);

    if (escolas.length === 0) {
      console.error('✗ Nenhuma escola carregada para processar');
      return;
    }

    const escolasProcessar = limit ? escolas.slice(0, limit) : escolas;

    // Carregar progresso existente
    const pastaData = path.dirname(arquivoSaida);
    const arquivoProgresso = path.join(pastaData, '.progress.json');
    let progresso = this.carregarProgresso(arquivoProgresso);

    const ehRetomada = progresso.lastIndex >= 0;
    if (ehRetomada) {
      console.log(`\n⏩ Retomando de onde parou... (última escola processada: ${progresso.lastIndex + 1}/${escolasProcessar.length})`);
      progresso.resumedAt = new Date().toISOString();
    } else {
      console.log(`\n🤖 Iniciando coleta de servidores de ${escolasProcessar.length} escolas...\n`);
    }

    if (limit) console.log(`   (modo teste: limitado a ${limit} escolas)\n`);

    const inicioTempo = Date.now();
    const inicioTempoEste = Date.now(); // para calcular tempo da retomada

    for (let idx = progresso.lastIndex + 1; idx < escolasProcessar.length; idx++) {
      const escola = escolasProcessar[idx];
      const nome = escola.nome || '';
      const codMEC = escola.cod_inep || '';
      const codSEC = escola.cod_sec || '';
      const percentual = Math.round((idx + 1) / escolasProcessar.length * 100);

      process.stdout.write(`\r[${idx + 1}/${escolasProcessar.length}] ${percentual}% - ${nome.substring(0, 50)}`);

      const resultado = await this.buscarServidores(codMEC, codSEC, nome);

      // Adiciona registro ao JSONL incrementalmente
      this.adicionarRegistroJSONL(arquivoSaida, resultado);

      progresso.lastIndex = idx;
      progresso.totalProcessadas += 1;

      if (resultado.status === 'sucesso' && resultado.total_servidores > 0) {
        progresso.totalComServidores += 1;
        progresso.totalServidores += resultado.total_servidores;
      } else if (resultado.status === 'erro') {
        progresso.totalErros += 1;
      }

      // Salva progresso após cada escola (permite retomada exata)
      this.salvarProgresso(arquivoProgresso, progresso);
    }

    const tempoTotal = ((Date.now() - inicioTempo) / 1000).toFixed(2);
    const tempoEste = ((Date.now() - inicioTempoEste) / 1000).toFixed(2);

    process.stdout.write('\r');
    console.log('\n');

    try {
      console.log('📊 Resumo:');
      console.log(`  • Total de escolas processadas: ${progresso.totalProcessadas}`);
      console.log(`  • Escolas com servidores encontrados: ${progresso.totalComServidores}`);
      console.log(`  • Total de erros: ${progresso.totalErros}`);
      console.log(`  • Total de servidores: ${progresso.totalServidores}`);
      if (progresso.totalComServidores > 0) {
        console.log(`  • Média de servidores por escola: ${(progresso.totalServidores / progresso.totalComServidores).toFixed(1)}`);
      }
      console.log(`  • Tempo total: ${tempoTotal}s${ehRetomada ? ` (tempo desta sessão: ${tempoEste}s)` : ''}`);
      if (progresso.totalProcessadas > 0) {
        console.log(`  • Tempo médio por escola: ${(parseFloat(tempoTotal) / progresso.totalProcessadas * 1000).toFixed(0)}ms`);
      }
      console.log(`\n✅ Resultados salvos em: ${arquivoSaida} (formato JSONL)`);
      console.log(`💾 Progresso salvo em: ${arquivoProgresso}`);

      // Marcar como completo se finalizou
      if (progresso.lastIndex === escolasProcessar.length - 1) {
        progresso.completedAt = new Date().toISOString();
        this.salvarProgresso(arquivoProgresso, progresso);
        console.log('🎉 Coleta completada com sucesso!');
      }
    } catch (erro) {
      console.error(`✗ Erro ao salvar resultados: ${erro.message}`);
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

const caminhoSaida = path.join(pastaData, 'ServidoresSecBA.jsonl');

const scraper = new ScraperServidoresSecBA({
  delay: 800
});

switch (comando) {
  case 'scrape':
    console.log('🚀 Iniciando coleta de servidores...');
    scraper.processarTodasEscolas(caminhoEntrada, caminhoSaida);
    break;

  case 'test':
    const limite = parseInt(args[1]) || 5;
    console.log(`🧪 Modo teste (${limite} escolas)`);
    const caminhoTesteSaida = path.join(pastaData, 'ServidoresSecBA_teste.jsonl');
    const caminhoTesteProgresso = path.join(pastaData, '.progress_teste.json');
    
    // Remove arquivos anteriores de teste para começar limpo
    if (fs.existsSync(caminhoTesteSaida)) {
      fs.unlinkSync(caminhoTesteSaida);
    }
    if (fs.existsSync(caminhoTesteProgresso)) {
      fs.unlinkSync(caminhoTesteProgresso);
    }
    
    scraper.processarTodasEscolas(caminhoEntrada, caminhoTesteSaida, { limit: limite });
    break;

  case 'help':
  default:
    console.log(`
🤖 SEC-BA Servidores Scraper

Extrai dados de servidores (funcionários) de todas as escolas da SEC-BA

Uso:
  node scraper_servidores.js <comando> [opções]

Comandos:
  scrape              Executa a coleta completa (1692 escolas)
  test [limite]       Executa em modo teste (padrão: 5 escolas)
  help                Mostra esta mensagem

Exemplos:
  node scraper_servidores.js scrape
  node scraper_servidores.js test 10
  node scraper_servidores.js test 50

Saída:
  • ServidoresSecBA.jsonl - Dados completos (formato JSONL)
  • ServidoresSecBA_teste.jsonl - Dados do modo teste (formato JSONL)
  • .progress.json - Arquivo de progresso (permite retomada)

Formato da saída (JSONL - uma linha JSON por registro):
{
  "status": "sucesso",
  "nome_escola": "...",
  "codigo_mec": "...",
  "codigo_sec": "...",
  "total_servidores": 5,
  "servidores": [
    {
      "matricula": "...",
      "nome": "...",
      "cargo": "...",
      "funcao": "...",
      "nivel": "...",
      "situacao": "...",
      "certificados": "..."
    }
  ]
}

Recursos:
  ✓ Checkpoint/Resume: Salva progresso após cada escola, permite retomada exata
  ✓ Ctrl+C: Interrompa a qualquer momento - próxima execução retoma de onde parou
  ✓ Formato JSONL: Cada linha é um registro JSON (eficiente para grandes volumes)
    `);
    break;
}
