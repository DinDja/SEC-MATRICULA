// Web Scraper para SEC-BA - Nodejs
// Consulta dados de escolas no site da Secretaria de Educação do Estado da Bahia

const fs = require('fs');
const path = require('path');
const http = require('http');
const querystring = require('querystring');
const { JSDOM } = require('jsdom');

class ScraperSecBA {
  constructor(opcoes = {}) {
    this.baseUrl = 'http://www.sec.ba.gov.br/siig/sistemaescolar/asp/pesquisaEscola/pesquisaescola.asp';
    this.delay = opcoes.delay || 500; // Delay entre requisições (ms)
    this.protocolo = opcoes.protocolo || 'http'; // 'http' ou 'https'
    this.timeout = opcoes.timeout || 15000;
    this.maxTentativas = opcoes.maxTentativas || 3;
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

  /**
   * Faz requisição HTTP POST com retry
   */
  fazerRequisicao(dados, tentativa = 1) {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify(dados);
      
      // O portal SEC-BA responde de forma mais estável em HTTP (porta 80)
      const protocolo = http;
      const porta = 80;
      
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

        res.on('data', (chunk) => {
          html += chunk;
        });

        res.on('end', () => {
          resolve(html);
        });
      });

      req.on('error', (erro) => {
        if (tentativa < this.maxTentativas) {
          console.log(`  ⟳ Tentativa ${tentativa + 1}/${this.maxTentativas}...`);
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
          console.log(`  ⟳ Timeout, tentativa ${tentativa + 1}/${this.maxTentativas}...`);
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

  /**
   * Busca uma escola no site SEC-BA pelo nome
   */
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
      
      // Aguardar um pouco para não sobrecarregar
      await this.aguardar(this.delay);

      // Parsear HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Procurar pela tabela de resultados
      const tabelas = document.querySelectorAll('table');

      if (tabelas.length < 2) {
        return {
          status: 'não encontrado',
          nome: nomeEscola,
          escolas: []
        };
      }

      // Extrair dados da tabela de resultados
      return this.extrairDadosTabela(tabelas[1], nomeEscola);

    } catch (erro) {
      console.error(`✗ Erro ao buscar "${nomeEscola}": ${erro.message}`);
      return {
        status: 'erro',
        nome: nomeEscola,
        mensagem: erro.message,
        escolas: []
      };
    }
  }

  /**
   * Extrai dados da tabela de resultados
   */
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

      // Pular header (primeira linha)
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

          // Tentar extrair link
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
      console.error(`✗ Erro ao extrair dados: ${erro.message}`);
      return {
        status: 'erro',
        nome: nomeEscola,
        mensagem: erro.message,
        escolas: []
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
   * Processa todas as escolas do arquivo JSON
   */
  async processarTodasEscolas(arquivoEntrada, arquivoSaida) {
    const escolas = this.carregarDadosUnidades(arquivoEntrada);

    if (escolas.length === 0) {
      console.error('✗ Nenhuma escola carregada para processar');
      return;
    }

    const resultados = {
      timestamp: new Date().toISOString(),
      total_processadas: 0,
      total_encontradas: 0,
      total_erros: 0,
      escolas: []
    };

    console.log(`\n🤖 Iniciando processamento de ${escolas.length} escolas...\n`);

    for (let idx = 0; idx < escolas.length; idx++) {
      const escola = escolas[idx];
      const nome = escola.nome || '';

      console.log(`[${idx + 1}/${escolas.length}] Processando: ${nome.substring(0, 60)}`);

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

    // Salvar resultados
    try {
      fs.writeFileSync(arquivoSaida, JSON.stringify(resultados, null, 2), 'utf-8');

      console.log('\n📊 Resumo:');
      console.log(`  • Total de escolas processadas: ${resultados.total_processadas}`);
      console.log(`  • Total encontradas no site: ${resultados.total_encontradas}`);
      console.log(`  • Total de erros: ${resultados.total_erros}`);
      console.log(`  • Resultados salvos em: ${arquivoSaida}`);
    } catch (erro) {
      console.error(`✗ Erro ao salvar resultados: ${erro.message}`);
    }
  }
}

// Executar
const scraper = new ScraperSecBA();
const caminhoEntrada = path.join(__dirname, 'DadosUnidades.json');
const pastaData = path.join(__dirname, 'data');
if (!fs.existsSync(pastaData)) {
  fs.mkdirSync(pastaData, { recursive: true });
}
const caminhoSaida = path.join(pastaData, 'ResultadosSEC.json');

scraper.processarTodasEscolas(caminhoEntrada, caminhoSaida).catch(console.error);
