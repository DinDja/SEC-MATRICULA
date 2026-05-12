# 🤖 Web Scraper SEC-BA - Servidores de Escolas

Sistema completo para consultar e extrair dados de escolas (e servidores) do site da Secretaria de Educação do Estado da Bahia.

## 📋 Sobre

Este projeto fornece múltiplas formas de acessar dados de escolas e servidores da SEC-BA:
- ✅ CLI com Node.js (para uso local)
- ✅ API Route com Next.js (para integração web)
- ✅ Scripts de teste e debug

## 🏗️ Estrutura do Projeto

```
c:\Workspace\SEC MATRICULA\
├── DadosUnidades.json                     # Entrada: Lista de escolas
├── scraper_servidores.js                  # Scraper básico (sem JS)
├── scraper_servidores_puppeteer.js        # Scraper avançado (com Puppeteer)
├── cli.js                                 # Interface CLI
├── debug_servidores.js                    # Debug/testes
├── next-api-route-scraper-escolas.js      # Rota Next.js
├── package.json                           # Dependências
├── README.md                              # Este arquivo
└── ResultadosSEC*.json                    # Saídas
```

## 📊 Dados de Entrada

O arquivo `DadosUnidades.json` deve ter a seguinte estrutura:

```json
{
  "ept": [
    {
      "nome": "COLEGIO ESTADUAL SAO SEBASTIAO",
      "cod_inep": "29057809",
      "cod_sec": "1125747",
      "TIPO DE UNIDADE": "SEDE"
    }
  ]
}
```

## 🚀 Instalação

### 1. Instalar dependências
```bash
npm install
```

### 2. (Opcional) Para scraper com JavaScript
```bash
npm install puppeteer
```

## 💻 Uso

### Opção 1: CLI Local (Recomendado para testes)

```bash
# Modo teste com 5 escolas
node scraper_servidores.js test 5

# Modo completo (576 escolas)
node scraper_servidores.js scrape
```

### Opção 2: Next.js API Route

Copie o arquivo `next-api-route-scraper-escolas.js` para:
```
pages/api/scraper-escolas.js
```

#### Uso da API:

**Consultar uma escola:**
```bash
curl "http://localhost:3000/api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747"
```

**Processar várias escolas:**
```bash
curl -X POST http://localhost:3000/api/scraper-escolas \
  -H "Content-Type: application/json" \
  -d '{
    "escolas": [
      {"cod_inep": "29057809", "cod_sec": "1125747", "nome": "ESCOLA 1"},
      {"cod_inep": "29058244", "cod_sec": "1125925", "nome": "ESCOLA 2"}
    ]
  }'
```

#### Resposta da API:
```json
{
  "sucesso": true,
  "timestamp": "2026-05-12T16:50:00.000Z",
  "dados": {
    "codigo_mec": "29057809",
    "codigo_sec": "1125747",
    "info_basica": {
      "unidade": "COLEGIO ESTADUAL SAO SEBASTIAO",
      "municipio": "AMERICA DOURADA",
      "nte": "NTE-01",
      "situacao": "EM ATIVIDADE"
    },
    "info_endereco": {
      "endereco": "RUA NESTOR BORGES, Nº 100",
      "bairro": "CENTRO"
    },
    "info_administrativa": {
      "porte": "GRANDE",
      "projeto": "ENSINO REGULAR",
      "oferta": "MÉDIO - EDUCAÇÃO PROFISSIONAL"
    }
  }
}
```

## 🔍 Servidores (Funcionários)

### ⚠️ Situação Atual

Os dados de **servidores** (funcionários das escolas) são carregados **dinamicamente via JavaScript** no site da SEC-BA, o que torna a extração mais complexa.

### Opções de Solução:

#### Opção A: Puppeteer (Recomendado para produção)
```bash
# Instalar
npm install puppeteer

# Usar
node scraper_servidores_puppeteer.js test 5
```

**Vantagens:**
- ✅ Extrai dados completos de servidores
- ✅ Executa JavaScript normalmente
- ✅ Confiável e testado

**Desvantagens:**
- ⚠️ Requer Chromium (~300MB)
- ⚠️ Mais lento (2-3s por escola)
- ⚠️ Maior consumo de memória

#### Opção B: API Next.js + Puppeteer

Crie uma rota separada:

```javascript
// pages/api/servidores-escolas.js
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  const { codigo_mec, codigo_sec } = req.query;

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const url = `http://www.sec.ba.gov.br/siig/sistemaescolar/asp/principal/consulta_escola.asp?codigo_mec=${codigo_mec}&codigo_secretaria=${codigo_sec}&SeqAnexo=0`;
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Clicar na aba Servidores
    await page.evaluate(() => {
      if (typeof tab16_on === 'function') tab16_on();
    });
    
    // Aguardar dados carregarem
    await page.waitForTimeout(2000);
    
    // Extrair tabela de servidores
    const servidores = await page.evaluate(() => {
      const resultado = [];
      const tabelas = document.querySelectorAll('table');
      
      for (let tabela of tabelas) {
        const linhas = tabela.querySelectorAll('tr');
        for (let i = 1; i < linhas.length; i++) {
          const colunas = linhas[i].querySelectorAll('td');
          if (colunas.length >= 3) {
            resultado.push({
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
      return resultado;
    });
    
    await browser.close();
    
    res.status(200).json({ servidores });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
}
```

#### Opção C: Dados Estruturados (Sem JavaScript)

Se o site oferecer um endpoint de dados (JSON), use:

```bash
# Exemplo hipotético
curl "http://www.sec.ba.gov.br/api/escolas/29057809/servidores"
```

## 📈 Performance

### Tempo de Execução

| Operação | Tempo | Velocidade |
|----------|-------|-----------|
| Consulta 1 escola (dados básicos) | ~1s | Rápida |
| Consulta 1 escola (com Puppeteer) | ~3-5s | Lenta |
| Processar 100 escolas (básico) | ~2min | Aceitável |
| Processar 576 escolas (completo) | ~5-10min | Lenta |

### Recomendações

1. **Para dados básicos:** Use a API sem Puppeteer
2. **Para servidores completos:** Use Node.js local com Puppeteer
3. **Para produção:** Implemente cache e processamento em background

## 🔧 Configuração Avançada

### Aumentar timeout
```javascript
const scraper = new ScraperServidoresSecBA({
  timeout: 30000,  // 30 segundos
  delay: 1000,     // 1 segundo entre requisições
  maxTentativas: 3
});
```

### Usar proxy
```bash
# Linux/Mac
HTTP_PROXY=http://proxy.seu-dominio.com:8080 npm run scrape

# Windows PowerShell
$env:HTTP_PROXY="http://proxy.seu-dominio.com:8080"
npm run scrape
```

## 🐛 Troubleshooting

### Erro: "ECONNREFUSED"
- Verifique conexão com internet
- Tente acessar manualmente: http://www.sec.ba.gov.br
- O servidor da SEC-BA pode estar offline

### Erro: "Timeout"
- Aumente o timeout: `timeout: 30000`
- Verifique sua conexão
- Tente com menos escolas

### Nenhum dado encontrado
- Verifique se os códigos MEC/SEC estão corretos
- Consulte manualmente no site da SEC-BA
- Os padrões HTML podem ter mudado

## 📝 Exemplos de Código

### Exemplo 1: Usar como módulo
```javascript
const fs = require('fs');

async function consultarEscola(codigoMEC, codigoSEC) {
  const response = await fetch(`/api/scraper-escolas?codigo_mec=${codigoMEC}&codigo_sec=${codigoSEC}`);
  const dados = await response.json();
  return dados.dados;
}

// Usar
const dadosEscola = await consultarEscola('29057809', '1125747');
console.log(dadosEscola);
```

### Exemplo 2: Processar em lote
```javascript
async function processarEscolas(arquivo) {
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
  
  const response = await fetch('/api/scraper-escolas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ escolas: dados.ept })
  });
  
  return await response.json();
}

const resultado = await processarEscolas('DadosUnidades.json');
console.log(`Processadas: ${resultado.total_processadas}`);
```

## 📊 Saída dos Dados

### Formato JSON
```json
{
  "timestamp": "2026-05-12T16:50:00.000Z",
  "total_processadas": 576,
  "escolas": [
    {
      "status": "sucesso",
      "nome": "ESCOLA...",
      "codigo_mec": "...",
      "codigo_sec": "...",
      "info_basica": {
        "unidade": "...",
        "municipio": "...",
        "nte": "...",
        "situacao": "..."
      },
      "info_endereco": { ... },
      "info_administrativa": { ... }
    }
  ]
}
```

## 🤝 Contribuições

Para melhorias:
1. Adicionar suporte para mais campos
2. Implementar cache Redis
3. Adicionar validação de dados
4. Melhorar extração de servidores

## ⚖️ Licença

MIT

## 📞 Suporte

- Verifique o site: http://www.sec.ba.gov.br
- Analise os arquivos de debug: `debug_*.html`
- Veja exemplos em `examples/`

---

**Desenvolvido para SEC Matricula - Consultas em tempo real**
