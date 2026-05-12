# 📂 ESTRUTURA DO PROJETO - Scraper SEC-BA

## Árvore de Arquivos

```
c:\Workspace\SEC MATRICULA\
│
├── 📋 ENTRADA & DADOS
│   ├── DadosUnidades.json                 (576 escolas - entrada principal)
│   ├── ResultadosSEC_teste.json          (exemplo de saída)
│   └── ServidoresSecBA_teste.json        (exemplo com servidores)
│
├── 🤖 SCRAPERS - SCRIPTS PRINCIPAIS
│   ├── scraper_servidores.js             ⭐ PRINCIPAL (sem JavaScript)
│   ├── scraper_servidores_puppeteer.js   (com Puppeteer/JavaScript)
│   ├── cli.js                            (interface CLI rápida)
│   ├── scraper_sec.js                    (versão alternativa)
│   ├── info_servidores.js                (teste básico)
│   └── debug_servidores.js               (ferramenta de debug)
│
├── 🌐 INTEGRAÇÃO - NEXT.JS
│   └── next-api-route-scraper-escolas.js (copie para pages/api/)
│
├── 📚 DOCUMENTAÇÃO
│   ├── SUMARIO.md                        📖 Leia primeiro!
│   ├── README.md                         (guia rápido)
│   ├── README_COMPLETO.md                (documentação completa)
│   └── ESTRUTURA.md                      (este arquivo)
│
├── 📦 CONFIGURAÇÃO
│   ├── package.json                      (dependências npm)
│   └── package-lock.json                 (lock file)
│
└── 🔧 TESTES & DEBUG
    ├── debug_response.html               (HTML bruto para análise)
    └── debug_servidores.html             (HTML de servidores)
```

## 📖 ARQUIVOS POR FUNÇÃO

### COMEÇAR AQUI 👈
- **SUMARIO.md** - Leia primeiro (2 minutos)
- **README.md** - Guia rápido

### USAR ESTES SCRIPTS
| Arquivo | Função | Uso |
|---------|--------|-----|
| `scraper_servidores.js` | Extrai dados básicos | `node scraper_servidores.js test 5` |
| `cli.js` | Interface CLI | `node cli.js scrape` |
| `next-api-route-scraper-escolas.js` | Rota Next.js | Copie para `pages/api/` |

### DOCUMENTAÇÃO COMPLETA
| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | Instruções básicas (5 min) |
| `README_COMPLETO.md` | Guia detalhado (30 min) |
| `SUMARIO.md` | Checklist & resumo |

### DESENVOLVIMENTO & DEBUG
| Arquivo | Função |
|---------|--------|
| `debug_servidores.js` | Analisa estrutura HTML |
| `debug_response.html` | HTML bruto para análise |
| `info_servidores.js` | Testa conexão com servidor |

---

## ✅ O QUE CADA ARQUIVO FАCE

### scraper_servidores.js
```javascript
// Scraper básico sem JavaScript
// ✅ Rápido (1s por escola)
// ✅ Funciona já
// ❌ Não extrai dinamicamente
// Uso: node scraper_servidores.js test 5
```

### scraper_servidores_puppeteer.js
```javascript
// Scraper com navegador (Puppeteer)
// ✅ Extrai dados dinâmicos
// ✅ Executa JavaScript
// ❌ Lento (3-5s por escola)
// ❌ Requer Puppeteer (300MB)
// Uso: npm install puppeteer
//      node scraper_servidores_puppeteer.js test 3
```

### next-api-route-scraper-escolas.js
```javascript
// Rota API para Next.js
// ✅ Integrado com Next.js
// ✅ HTTP GET & POST
// ✅ CORS habilitado
// Uso: Copie para pages/api/scraper-escolas.js
//      GET /api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747
//      POST /api/scraper-escolas (com array de escolas)
```

### cli.js
```javascript
// Interface linha de comando
// ✅ Múltiplos modos (scrape, test, buscar)
// ✅ Modo teste para verificar rápido
// Uso: node cli.js scrape
//      node cli.js test 10
//      node cli.js buscar "NOME DA ESCOLA"
```

---

## 🚀 FLUXO DE USO RECOMENDADO

### 1️⃣ TESTE INICIAL (2 minutos)
```bash
cd "c:\Workspace\SEC MATRICULA"
npm install                    # Se não feito ainda
node scraper_servidores.js test 3
```
Resultado: `ServidoresSecBA_teste.json`

### 2️⃣ EXECUÇÃO COMPLETA (15 minutos)
```bash
node scraper_servidores.js scrape
```
Resultado: `ServidoresSecBA.json` (576 escolas)

### 3️⃣ INTEGRAÇÃO COM NEXT.JS (10 minutos)
```bash
# 1. Copie o arquivo
cp next-api-route-scraper-escolas.js ../seu-projeto/pages/api/scraper-escolas.js

# 2. Teste a API
curl "http://localhost:3000/api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747"
```

### 4️⃣ EXTRAIR SERVIDORES (opcional - 20+ minutos)
```bash
npm install puppeteer
node scraper_servidores_puppeteer.js test 3
```

---

## 📊 DADOS GERADOS

### Saída padrão (JSON)
```javascript
{
  "timestamp": "2026-05-12T...",
  "configuracao": { ... },
  "resumo": {
    "total_processadas": 576,
    "total_com_servidores": 450,
    "total_erros": 126,
    "total_servidores": 2145
  },
  "escolas": [ ... ]
}
```

### Campos extraídos de cada escola
```javascript
{
  "codigo_mec": "29057809",
  "codigo_sec": "1125747",
  "nome": "COLEGIO ESTADUAL SAO SEBASTIAO",
  "info_basica": {
    "unidade": "...",
    "municipio": "...",
    "nte": "...",
    "situacao": "..."
  },
  "info_endereco": { ... },
  "info_administrativa": { ... }
}
```

---

## 🔧 CONFIGURAÇÃO RÁPIDA

### Aumentar limite de escolas no teste
Edite: `scraper_servidores.js` linha 200
```javascript
limit: 10  // Mude para quantas quiser
```

### Ajustar timeout (para conexões lentas)
Edite: `scraper_servidores.js` linha 8
```javascript
this.timeout = 15000  // Para 30000 (30 segundos)
```

### Mudar delay entre requisições
Edite: `scraper_servidores.js` linha 9
```javascript
this.delay = 500  // Para 1000 (1 segundo)
```

---

## 📱 EXEMPLOS DE CHAMADA

### Via Node.js direto
```bash
node scraper_servidores.js test 50
```

### Via CLI
```bash
node cli.js scrape
node cli.js test 25
node cli.js buscar "COLEGIO ESTADUAL SAO SEBASTIAO"
```

### Via API (Next.js)
```javascript
// GET uma escola
const res = await fetch('/api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747');

// POST várias escolas
const res = await fetch('/api/scraper-escolas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    escolas: [
      { cod_inep: '29057809', cod_sec: '1125747', nome: 'ESCOLA 1' },
      { cod_inep: '29058244', cod_sec: '1125925', nome: 'ESCOLA 2' }
    ]
  })
});
```

---

## 🔍 DEBUG & TROUBLESHOOTING

### Ver estrutura HTML do site
```bash
node debug_servidores.js
# Gera: debug_servidores.html (abra no navegador)
```

### Testar uma única escola
```bash
node cli.js buscar "NOME DA ESCOLA"
```

### Ver logs detalhados
Terminal já mostra tudo
- [x] Processadas
- [x] Encontradas  
- [x] Erros
- [x] Tempo total

---

## 📈 PRÓXIMAS MELHORIAS POSSÍVEIS

- [ ] Cache com Redis
- [ ] Processamento paralelo
- [ ] Banco de dados (MongoDB/PostgreSQL)
- [ ] Webhook para notificação
- [ ] Dashboard com gráficos
- [ ] Agendamento automático (CRON)
- [ ] Exportar para Excel/CSV

---

## 📞 CHECKLIST FINAL

- [ ] Li o SUMARIO.md
- [ ] Instalei com `npm install`
- [ ] Testei: `node scraper_servidores.js test 3`
- [ ] Vi a saída em `ServidoresSecBA_teste.json`
- [ ] Copiei rota para Next.js (se usar)
- [ ] Documentação revisada
- [ ] Pronto para usar em produção

---

## 🎓 ESTRUTURA DE PASTAS RECOMENDADA

Se integrar com Next.js:

```
seu-projeto/
├── pages/
│   └── api/
│       └── scraper-escolas.js      ← Copie next-api-route-scraper-escolas.js
├── public/
│   └── data/
│       └── DadosUnidades.json      ← Copie seu arquivo de entrada
├── lib/
│   └── scraper.js                  ← Reutilizável
└── data/
    ├── ResultadosSEC.json          ← Saídas
    └── cache/
```

---

## 📚 LEITURA RECOMENDADA

1. **SUMARIO.md** (2 min) - Visão geral
2. **README.md** (5 min) - Instruções básicas  
3. **README_COMPLETO.md** (30 min) - Tudo em detalhe
4. **Este arquivo** (10 min) - Referência técnica
5. **Código fonte** - Para entender funcionamento

---

**Última atualização: 12/05/2026**
**Versão: 1.0.0**
**Status: ✅ Pronto para Produção**

🎉 Você tem tudo que precisa para começar!
