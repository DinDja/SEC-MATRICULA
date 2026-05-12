# Web Scraper SEC-BA 🤖

Web scraper automático para consultar dados de escolas do site da Secretaria de Educação do Estado da Bahia (SEC-BA).

## 📋 Funcionalidades

- ✅ Leitura automática de dados de escolas do arquivo `DadosUnidades.json`
- ✅ Consulta do site SEC-BA para cada escola
- ✅ Extração de informações: código, nome, município, NTE, tipo de polo e situação
- ✅ Retry automático em caso de falhas
- ✅ Fallback de HTTP para HTTPS
- ✅ Salva resultados em JSON com timestamp
- ✅ Log detalhado do processo

## 🚀 Instalação

```bash
npm install
```

Dependências:
- `jsdom` - Para parsing de HTML

## 📝 Uso

### Executar scraper completo (576 escolas)
```bash
npm run scrape
```

### Executar em modo desenvolvimento (com warnings)
```bash
npm run scrape:dev
```

## API de Matriculas (Vercel)

Foram adicionados endpoints serverless para consulta de matriculas de professores/servidores usando o arquivo `data/ServidoresSecBA.jsonl`.

### Endpoints

- `GET /api/health`
- `GET /api/matriculas`
- `POST /api/matriculas`

### Exemplos de consulta (GET)

Buscar por matricula exata:

```bash
/api/matriculas?matricula=92179811
```

Buscar por nome (parcial):

```bash
/api/matriculas?nome=alex+sandro
```

Somente professores em atividade:

```bash
/api/matriculas?somente_professores=true&situacao=em+atividade&page=1&limit=20
```

Filtros disponiveis:

- `matricula` (exata)
- `nome` (parcial)
- `cargo` (parcial)
- `situacao` (parcial)
- `escola` (parcial)
- `somente_professores` (`true/false`)
- `page` (padrao `1`)
- `limit` (padrao `20`, max `100`)

### Consulta em lote (POST)

Body JSON:

```json
{
  "matriculas": ["92179811", "111703573"]
}
```

### Deploy no Vercel

1. Suba o projeto para um repositorio Git.
2. Importe no Vercel.
3. O Vercel detecta automaticamente a pasta `api/`.
4. Apos deploy, teste:

```bash
https://SEU-DOMINIO.vercel.app/api/health
https://SEU-DOMINIO.vercel.app/api/matriculas?matricula=92179811
```

### Usar como módulo (em aplicação Node.js/Next.js)

```javascript
const ScraperSecBA = require('./scraper_sec.js');

const scraper = new ScraperSecBA({
  delay: 500,           // Delay entre requisições (ms)
  protocolo: 'http',    // 'http' ou 'https'
  timeout: 15000,       // Timeout por requisição (ms)
  maxTentativas: 3      // Máximo de tentativas por requisição
});

// Buscar uma escola específica
const resultado = await scraper.buscarEscola('COLEGIO ESTADUAL SAO SEBASTIAO');
console.log(resultado);

// Processar todas as escolas
await scraper.processarTodasEscolas('DadosUnidades.json', 'ResultadosSEC.json');
```

## 📂 Arquivos

- `DadosUnidades.json` - Entrada com lista de escolas (formato: `{ ept: [...] }`)
- `ResultadosSEC.json` - Saída com resultados de busca
- `scraper_sec.js` - Código principal do scraper
- `package.json` - Configuração e dependências do projeto

## 📊 Formato de Saída

```json
{
  "timestamp": "2026-05-12T10:30:00.000Z",
  "total_processadas": 576,
  "total_encontradas": 450,
  "total_erros": 126,
  "escolas": [
    {
      "status": "sucesso",
      "nome": "COLEGIO ESTADUAL SAO SEBASTIAO",
      "cod_inep": "29057809",
      "cod_sec": "1125747",
      "tipo_unidade": "SEDE",
      "escolas": [
        {
          "codigo": "29057809",
          "nome_site": "COLEGIO ESTADUAL SAO SEBASTIAO",
          "municipio": "IRECÊ",
          "nte": "NTE-03",
          "polo": "SEDE do POLO",
          "situacao": "ATIVA",
          "link": "..."
        }
      ]
    }
  ]
}
```

## ⚙️ Configuração

### Para usar com proxy
Se seu sistema usar proxy corporativo, configure as variáveis de ambiente:

```bash
set HTTP_PROXY=http://proxy.seu-dominio.com:8080
set HTTPS_PROXY=http://proxy.seu-dominio.com:8080
npm run scrape
```

### Aumentar timeout para conexões lentas
```bash
node --max-old-space-size=4096 scraper_sec.js
```

## 🔧 Integração com Next.js

Para integrar com uma rota Next.js:

```javascript
// pages/api/scrape-sec.js
import ScraperSecBA from '@/lib/scraper_sec';

export default async function handler(req, res) {
  const scraper = new ScraperSecBA({ delay: 500 });
  
  if (req.method === 'POST') {
    const { nomeEscola } = req.body;
    
    try {
      const resultado = await scraper.buscarEscola(nomeEscola);
      res.status(200).json(resultado);
    } catch (erro) {
      res.status(500).json({ erro: erro.message });
    }
  } else {
    res.status(405).json({ erro: 'Método não permitido' });
  }
}
```

## 🐛 Troubleshooting

### Erro: "ECONNREFUSED"
- O site pode estar fora do ar ou inacessível
- Verifique sua conexão com a internet
- Tente acessar manualmente: http://www.sec.ba.gov.br/siig/sistemaescolar/asp/pesquisaEscola/pesquisaescola.asp

### Erro: "Timeout"
- O servidor está lento
- Aumente o timeout na configuração: `new ScraperSecBA({ timeout: 30000 })`
- Aumente o delay entre requisições: `new ScraperSecBA({ delay: 2000 })`

### Nenhuma escola encontrada
- Verifique se o nome no JSON está correto
- O site pode ter formatação diferente para o nome
- Tente buscar manualmente no site

## 📈 Performance

- Tempo estimado: ~5 minutos para 576 escolas (com delay de 500ms)
- Sem delay entre requisições: ~2-3 minutos (não recomendado)
- O script respeitará o delay para não sobrecarregar o servidor SEC-BA

## 📝 Notas

- Este scraper respeita um delay entre requisições para não sobrecarregar o servidor
- Os dados são consultados em tempo real do site SEC-BA
- Resultados são salvos com timestamp para rastreabilidade
- O script é idempotente: pode ser executado múltiplas vezes com segurança

## 🤝 Contribuições

Para melhorias ou correções, considere:
- Adicionar suporte para extrair mais campos das escolas
- Implementar cache para evitar requisições duplicadas
- Adicionar validação de dados de entrada

## 📄 Licença

MIT

---

**Desenvolvido para SEC Matricula - Consultas em tempo real da Secretaria de Educação da Bahia**
