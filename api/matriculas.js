const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'ServidoresSecBA.jsonl');
const MAX_LIMIT = 100;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function asBoolean(value) {
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'sim', 'yes'].includes(String(value || '').toLowerCase());
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function isProfessor(cargo) {
  const normalizedCargo = normalize(cargo);
  return normalizedCargo.includes('PROF');
}

function loadServidores() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Arquivo de dados nao encontrado: ${DATA_FILE}`);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const servidores = [];

  for (const line of lines) {
    const registro = JSON.parse(line);
    const nomeEscola = registro.nome_escola || '';
    const codigoMec = registro.codigo_mec || '';
    const codigoSec = registro.codigo_sec || '';
    const lista = Array.isArray(registro.servidores) ? registro.servidores : [];

    for (const servidor of lista) {
      servidores.push({
        matricula: String(servidor.matricula || '').trim(),
        nome: String(servidor.nome || '').trim(),
        cargo: String(servidor.cargo || '').trim(),
        funcao: String(servidor.funcao || '').trim(),
        nivel: String(servidor.nivel || '').trim(),
        situacao: String(servidor.situacao || '').trim(),
        certificados: String(servidor.certificados || '').trim(),
        escola: nomeEscola,
        codigo_mec: codigoMec,
        codigo_sec: codigoSec
      });
    }
  }

  return servidores;
}

function filterServidores(servidores, query) {
  const matricula = String(query.matricula || '').trim();
  const nome = normalize(query.nome);
  const cargo = normalize(query.cargo);
  const situacao = normalize(query.situacao);
  const escola = normalize(query.escola);
  const somenteProfessores = asBoolean(query.somente_professores);

  return servidores.filter((item) => {
    if (matricula && item.matricula !== matricula) return false;
    if (nome && !normalize(item.nome).includes(nome)) return false;
    if (cargo && !normalize(item.cargo).includes(cargo)) return false;
    if (situacao && !normalize(item.situacao).includes(situacao)) return false;
    if (escola && !normalize(item.escola).includes(escola)) return false;
    if (somenteProfessores && !isProfessor(item.cargo)) return false;
    return true;
  });
}

function paginate(items, page, limit) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const servidores = loadServidores();

    if (req.method === 'GET') {
      const page = parsePositiveInt(req.query.page, 1);
      const limit = Math.min(parsePositiveInt(req.query.limit, 20), MAX_LIMIT);
      const filtrados = filterServidores(servidores, req.query);
      const total = filtrados.length;
      const totalPaginas = Math.max(1, Math.ceil(total / limit));

      return res.status(200).json({
        ok: true,
        timestamp: new Date().toISOString(),
        total_registros: servidores.length,
        total_encontrados: total,
        pagina: page,
        limite: limit,
        total_paginas: totalPaginas,
        data: paginate(filtrados, page, limit)
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const matriculas = Array.isArray(body.matriculas) ? body.matriculas : [];

      if (matriculas.length === 0) {
        return res.status(400).json({
          ok: false,
          erro: 'Informe um array nao vazio em body.matriculas'
        });
      }

      const wanted = new Set(matriculas.map((item) => String(item).trim()).filter(Boolean));
      const encontrados = servidores.filter((item) => wanted.has(item.matricula));

      return res.status(200).json({
        ok: true,
        timestamp: new Date().toISOString(),
        solicitadas: wanted.size,
        encontradas: encontrados.length,
        data: encontrados
      });
    }

    return res.status(405).json({
      ok: false,
      erro: 'Metodo nao permitido. Use GET, POST ou OPTIONS.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      erro: 'Falha ao processar consulta de matriculas',
      detalhe: error.message
    });
  }
};