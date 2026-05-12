/**
 * API Route: /api/scraper-escolas
 * 
 * Scraper de dados de escolas da SEC-BA
 * Pode ser chamado como GET para testar ou POST para processar em lote
 * 
 * Exemplo de uso:
 * GET /api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747
 * POST /api/scraper-escolas { "escolas": [...] }
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

// Função para fazer requisições HTTP
function fazerRequisicao(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opcoes = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    };

    let tentativas = 0;
    const maxTentativas = 2;

    function tentar() {
      const req = http.request(opcoes, (res) => {
        let html = '';
        res.on('data', (chunk) => { html += chunk; });
        res.on('end', () => { resolve({ status: res.statusCode, html }); });
      });

      req.on('error', (erro) => {
        tentativas++;
        if (tentativas < maxTentativas) {
          setTimeout(tentar, 1000);
        } else {
          reject(erro);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    }

    tentar();
  });
}

// Função para extrair dados básicos da escola
function extrairDadosEscola(html, codigoMEC, codigoSEC) {
  const dados = {
    codigo_mec: codigoMEC,
    codigo_sec: codigoSEC,
    info_basica: {},
    info_endereco: {},
    info_administrativa: {},
    servidores_nota: 'Dados de servidores requerem execução de JavaScript. Use a rota /api/servidores-escolas'
  };

  try {
    // Regex para extrair informações
    const patterns = {
      unidade: /Unidade:.*?<b>(.*?)<\/b>/i,
      municipio: /Município:.*?<b>(.*?)<\/b>/i,
      endereco: /Endereço:.*?<b>(.*?)<\/b>/i,
      bairro: /Bairro:.*?<b>(.*?)<\/b>/i,
      nte: /N[uú]cleo Regional:.*?<b>(.*?)<\/b>/i,
      situacao: /Sit\. Funcional:.*?<b>(.*?)<\/b>/i,
      porte: /Porte:.*?<b>(.*?)<\/b>/i,
      projeto: /Projeto:.*?<b>(.*?)<\/b>/i,
      email: /E-mail:.*?<b>(.*?)<\/b>/i,
      oferta: /Oferta de Ensino:.*?<b>(.*?)<\/b>/i
    };

    for (const [chave, regex] of Object.entries(patterns)) {
      const match = html.match(regex);
      if (match && match[1]) {
        const valor = match[1].trim().replace(/&[a-z]+;/g, '');
        
        if (['unidade', 'municipio', 'bairro', 'nte', 'situacao', 'porte', 'projeto', 'email', 'oferta'].includes(chave)) {
          if (['unidade', 'municipio', 'nte', 'situacao'].includes(chave)) {
            dados.info_basica[chave] = valor;
          } else {
            dados.info_administrativa[chave] = valor;
          }
        } else {
          dados.info_endereco[chave] = valor;
        }
      }
    }
  } catch (erro) {
    console.error('Erro ao extrair dados:', erro);
  }

  return dados;
}

// Handler principal
export default async function handler(req, res) {
  const { method } = req;

  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (method === 'GET') {
      const { codigo_mec, codigo_sec } = req.query;

      if (!codigo_mec || !codigo_sec) {
        return res.status(400).json({
          erro: 'Parâmetros obrigatórios: codigo_mec e codigo_sec',
          exemplo: '/api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747'
        });
      }

      // Construir URL de consulta
      const url = `http://www.sec.ba.gov.br/siig/sistemaescolar/asp/principal/consulta_escola.asp?codigo_mec=${codigo_mec}&codigo_secretaria=${codigo_sec}&SeqAnexo=0`;

      const { status, html } = await fazerRequisicao(url);

      if (status !== 200) {
        return res.status(status).json({ erro: `Erro ao consultar SEC-BA (${status})` });
      }

      const dados = extrairDadosEscola(html, codigo_mec, codigo_sec);

      return res.status(200).json({
        sucesso: true,
        timestamp: new Date().toISOString(),
        dados
      });
    }

    if (method === 'POST') {
      const { escolas } = req.body;

      if (!Array.isArray(escolas)) {
        return res.status(400).json({
          erro: 'Body deve conter um array de escolas com cod_inep e cod_sec'
        });
      }

      const resultados = {
        timestamp: new Date().toISOString(),
        total_processadas: 0,
        total_erros: 0,
        escolas: []
      };

      for (const escola of escolas) {
        try {
          const { cod_inep, cod_sec, nome } = escola;
          const url = `http://www.sec.ba.gov.br/siig/sistemaescolar/asp/principal/consulta_escola.asp?codigo_mec=${cod_inep}&codigo_secretaria=${cod_sec}&SeqAnexo=0`;

          const { status, html } = await fazerRequisicao(url);

          if (status === 200) {
            const dados = extrairDadosEscola(html, cod_inep, cod_sec);
            dados.nome = nome;
            resultados.escolas.push({
              status: 'sucesso',
              ...dados
            });
          } else {
            resultados.escolas.push({
              status: 'erro',
              nome,
              codigo_mec: cod_inep,
              codigo_sec: cod_sec,
              mensagem: `Erro ${status}`
            });
            resultados.total_erros++;
          }

          resultados.total_processadas++;

          // Delay para não sobrecarregar o servidor
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (erro) {
          resultados.total_erros++;
          resultados.total_processadas++;
        }
      }

      return res.status(200).json({
        sucesso: true,
        ...resultados
      });
    }

    res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    console.error('Erro:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: erro.message
    });
  }
}
