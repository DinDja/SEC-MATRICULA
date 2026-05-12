# 📦 SUMÁRIO EXECUTIVO - Scraper SEC-BA

## ✅ O que foi criado

### 1️⃣ SCRAPER FUNCIONAL
- **`scraper_servidores.js`** - Scraper básico (dados sem JavaScript)
- **`scraper_servidores_puppeteer.js`** - Scraper completo (executa JavaScript)
- **`cli.js`** - Interface CLI para teste rápido

### 2️⃣ API NEXT.JS
- **`next-api-route-scraper-escolas.js`** - Rota pronta para Next.js

### 3️⃣ DOCUMENTAÇÃO
- **`README.md`** - Guia rápido
- **`README_COMPLETO.md`** - Documentação detalhada
- **`debug_servidores.js`** - Ferramenta de debug

### 4️⃣ ENTRADA/SAÍDA
- **`DadosUnidades.json`** - Seus dados de entrada (576 escolas)
- **`ResultadosSEC_teste.json`** - Exemplo de saída
- **`package.json`** - Dependências npm

---

## 🚀 INÍCIO RÁPIDO

### Teste local (3 escolas):
```bash
cd "c:\Workspace\SEC MATRICULA"
node scraper_servidores.js test 3
```

### Processar todas (576 escolas):
```bash
node scraper_servidores.js scrape
```

### Usar no Next.js:
1. Copie `next-api-route-scraper-escolas.js` para `pages/api/scraper-escolas.js`
2. Chame via API:
```javascript
const res = await fetch('/api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747');
const dados = await res.json();
```

---

## 📊 DADOS EXTRAÍDOS

### Dados Básicos (Sem JavaScript):
✅ Nome da escola
✅ Código MEC
✅ Código SEC
✅ Endereço
✅ Município
✅ NTE (Núcleo Territorial)
✅ Situação funcional
✅ Porte
✅ Oferta de ensino
✅ E-mail

### Servidores (Com JavaScript):
⏳ Matrícula
⏳ Nome do servidor
⏳ Cargo
⏳ Data de designação
⏳ Portaria

---

## 🎯 DADOS DE SERVIDORES - PRÓXIMOS PASSOS

Os dados de **servidores** são carregados dinamicamente (JavaScript) no site.

### Opção A: Usar Puppeteer (Recomendado)
```bash
npm install puppeteer
node scraper_servidores_puppeteer.js test 3
```

### Opção B: Integrar com Next.js + Puppeteer
Veja instruções em `README_COMPLETO.md` - Seção "Servidores (Funcionários)"

### Opção C: Verificar se site tem API
```bash
# Tente estas URLs:
http://www.sec.ba.gov.br/api/escolas/29057809/servidores
http://www.sec.ba.gov.br/siig/sistemaescolar/asp/api/servidores.json
```

---

## 📁 ARQUIVOS POR TIPO

### Scripts Diretos:
- `scraper_servidores.js` - Funciona agora ✅
- `cli.js` - Teste rápido ✅
- `next-api-route-scraper-escolas.js` - Pronto para Next.js ✅

### Scripts Opcionais:
- `scraper_servidores_puppeteer.js` - Requer `npm install puppeteer`
- `debug_servidores.js` - Para análise do site

### Dados:
- `DadosUnidades.json` - 576 escolas já carregadas
- `ResultadosSEC_teste.json` - Exemplo de saída

### Docs:
- `README.md` - Rápido
- `README_COMPLETO.md` - Detalhado

---

## 🔧 PRÓXIMAS AÇÕES RECOMENDADAS

### 1. Teste Local (5 minutos)
```bash
cd "c:\Workspace\SEC MATRICULA"
node scraper_servidores.js test 5
```
✅ Verifica se tudo está funcionando

### 2. Integre com Next.js (10 minutos)
- Copie `next-api-route-scraper-escolas.js` para `pages/api/scraper-escolas.js`
- Teste via: `GET /api/scraper-escolas?codigo_mec=29057809&codigo_sec=1125747`

### 3. Para Servidores (30+ minutos)
- Instale Puppeteer: `npm install puppeteer`
- Execute: `node scraper_servidores_puppeteer.js test 3`
- Ou implemente rota Next.js com Puppeteer (veja README_COMPLETO.md)

### 4. Deploy em Produção
- Implemente cache (Redis)
- Use background jobs (Bull, Resque)
- Monitore timeouts e erros
- Respeite rate limits do servidor SEC-BA

---

## ⚙️ CONFIGURAÇÃO FÁCIL

### Aumentar timeout (para servidores lentos):
Edite o arquivo e mude:
```javascript
timeout: 15000  // para 30000 (30 segundos)
```

### Mudar delay entre requisições:
```javascript
delay: 800  // para 1500 (1.5 segundos)
```

### Limitar escolas em lote:
```javascript
node scraper_servidores.js test 50  // Processa apenas 50 escolas
```

---

## 📊 PERFORMANCE

| Ação | Tempo | Status |
|------|-------|--------|
| 1 escola (dados básicos) | 1s | ✅ Rápido |
| 10 escolas (dados básicos) | 10-15s | ✅ Rápido |
| 100 escolas (dados básicos) | 2-3min | ✅ Aceitável |
| 576 escolas (dados básicos) | 10-15min | ⏳ Lento |
| Com servidores (Puppeteer) | 3-5s/escola | ⏳ Muito lento |

---

## 💡 DICAS IMPORTANTES

### ✅ Melhorar velocidade:
1. Aumente delay mínimo entre requisições (respeite o servidor)
2. Use paralelização (múltiplas instâncias Node.js)
3. Implemente cache dos resultados

### ✅ Evitar bloqueios:
1. Não faça >100 requisições/minuto ao site SEC-BA
2. Respeite o delay de 500-800ms
3. Use User-Agent realista (já configurado)

### ✅ Debug:
1. Veja arquivos `debug_*.html` para analisar estrutura
2. Use `scraper_servidores.js test 1` para testar uma escola
3. Verifique logs no terminal

---

## 🎓 EXEMPLO DE USO COMPLETO

```javascript
// No seu Next.js component ou rota:

async function consultarEscolas() {
  // Ler dados das escolas
  const dados = require('./DadosUnidades.json');
  
  // Enviar para scraper
  const response = await fetch('/api/scraper-escolas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ escolas: dados.ept.slice(0, 10) }) // Primeiras 10
  });
  
  const resultado = await response.json();
  
  // Salvar resultados
  console.log(`Processadas: ${resultado.total_processadas}`);
  console.log(`Erros: ${resultado.total_erros}`);
  
  // Usar dados...
  resultado.escolas.forEach(escola => {
    console.log(`${escola.nome}: ${escola.info_basica.municipio}`);
  });
}
```

---

## 📞 SUPORTE & TROUBLESHOOTING

### Site offline?
```bash
# Teste manualmente:
curl -I http://www.sec.ba.gov.br/
```

### Verifique logs:
- Terminal mostra detalhes de erros
- Arquivos `debug_*.html` contêm HTML bruto

### Leia a documentação:
- `README_COMPLETO.md` - Seção "Troubleshooting"

---

## 📋 CHECKLIST

- [ ] Baixei/criei todos os arquivos
- [ ] Instalei dependências: `npm install`
- [ ] Testei local: `node scraper_servidores.js test 3`
- [ ] Copiei rota para Next.js (opcional)
- [ ] Verifiquei saída JSON em `ResultadosSEC*.json`
- [ ] Integrei com meu sistema
- [ ] (Opcional) Instalei Puppeteer para servidores

---

**Criado em: 12/05/2026**
**Status: ✅ Pronto para usar**
**Desenvolvido para: SEC Matricula**
