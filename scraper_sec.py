#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Web Scraper para SEC-BA
Consulta dados de escolas no site da Secretaria de Educação do Estado da Bahia
"""

import json
import requests
from bs4 import BeautifulSoup
import time
from typing import List, Dict, Any
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ScrapeSecBA:
    def __init__(self):
        self.base_url = "http://www.sec.ba.gov.br/siig/sistemaescolar/asp/pesquisaEscola/pesquisaescola.asp"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.timeout = 10
        self.delay = 0.5  # Delay entre requisições (em segundos)
        
    def carregar_dados_unidades(self, arquivo: str) -> List[Dict[str, Any]]:
        """Carrega o arquivo JSON com dados das unidades"""
        try:
            with open(arquivo, 'r', encoding='utf-8') as f:
                dados = json.load(f)
            
            escolas = dados.get('ept', [])
            logger.info(f"Carregadas {len(escolas)} escolas do arquivo {arquivo}")
            return escolas
        
        except FileNotFoundError:
            logger.error(f"Arquivo {arquivo} não encontrado")
            return []
        except json.JSONDecodeError:
            logger.error(f"Erro ao decodificar JSON do arquivo {arquivo}")
            return []
    
    def buscar_escola(self, nome_escola: str) -> Dict[str, Any]:
        """Busca uma escola no site SEC-BA pelo nome"""
        try:
            # Requisição POST para buscar a escola
            dados_post = {
                'txtNomeEscola': nome_escola,
                'cmbNTE': '',
                'cmbPolo': '',
                'cmbMunicipio': '',
                'btnPesquisar': 'Pesquisar'
            }
            
            resposta = self.session.post(
                self.base_url,
                data=dados_post,
                timeout=self.timeout
            )
            
            if resposta.status_code != 200:
                logger.warning(f"Status code {resposta.status_code} para escola: {nome_escola}")
                return {'status': 'erro', 'nome': nome_escola, 'mensagem': f'Status {resposta.status_code}'}
            
            # Parsear HTML
            soup = BeautifulSoup(resposta.content, 'html.parser')
            
            # Procurar pela tabela de resultados
            tabelas = soup.find_all('table')
            
            if not tabelas or len(tabelas) < 2:
                logger.info(f"Nenhum resultado encontrado para: {nome_escola}")
                return {'status': 'não encontrado', 'nome': nome_escola}
            
            # Tentar extrair dados da tabela de resultados
            resultados = self._extrair_dados_tabela(tabelas[1], nome_escola)
            
            time.sleep(self.delay)  # Delay para não sobrecarregar o servidor
            
            return resultados
        
        except requests.exceptions.Timeout:
            logger.error(f"Timeout na busca por: {nome_escola}")
            return {'status': 'erro', 'nome': nome_escola, 'mensagem': 'Timeout'}
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição para {nome_escola}: {str(e)}")
            return {'status': 'erro', 'nome': nome_escola, 'mensagem': str(e)}
        except Exception as e:
            logger.error(f"Erro inesperado ao buscar {nome_escola}: {str(e)}")
            return {'status': 'erro', 'nome': nome_escola, 'mensagem': str(e)}
    
    def _extrair_dados_tabela(self, tabela, nome_escola: str) -> Dict[str, Any]:
        """Extrai dados da tabela de resultados"""
        try:
            linhas = tabela.find_all('tr')
            
            if len(linhas) <= 1:  # Só header
                return {'status': 'não encontrado', 'nome': nome_escola}
            
            dados = {
                'status': 'sucesso',
                'nome': nome_escola,
                'escolas': []
            }
            
            # Pular header (primeira linha)
            for linha in linhas[1:]:
                colunas = linha.find_all('td')
                
                if len(colunas) >= 6:
                    escola_info = {
                        'codigo': colunas[0].get_text(strip=True),
                        'nome_site': colunas[1].get_text(strip=True),
                        'municipio': colunas[2].get_text(strip=True),
                        'nte': colunas[3].get_text(strip=True),
                        'polo': colunas[4].get_text(strip=True),
                        'situacao': colunas[5].get_text(strip=True) if len(colunas) > 5 else '',
                    }
                    
                    # Tentar extrair link para mais detalhes
                    link = colunas[0].find('a')
                    if link and link.get('href'):
                        escola_info['link'] = link.get('href')
                    
                    dados['escolas'].append(escola_info)
            
            return dados
        
        except Exception as e:
            logger.error(f"Erro ao extrair dados da tabela para {nome_escola}: {str(e)}")
            return {'status': 'erro', 'nome': nome_escola, 'mensagem': f'Erro ao processar: {str(e)}'}
    
    def processar_todas_escolas(self, arquivo_entrada: str, arquivo_saida: str) -> None:
        """Processa todas as escolas do arquivo JSON e salva resultados"""
        
        escolas = self.carregar_dados_unidades(arquivo_entrada)
        
        if not escolas:
            logger.error("Nenhuma escola carregada para processar")
            return
        
        resultados = {
            'total_processadas': 0,
            'total_encontradas': 0,
            'total_erros': 0,
            'escolas': []
        }
        
        logger.info(f"Iniciando processamento de {len(escolas)} escolas...")
        
        for idx, escola in enumerate(escolas, 1):
            nome = escola.get('nome', '')
            
            logger.info(f"[{idx}/{len(escolas)}] Processando: {nome}")
            
            resultado = self.buscar_escola(nome)
            resultado['cod_inep'] = escola.get('cod_inep', '')
            resultado['cod_sec'] = escola.get('cod_sec', '')
            resultado['tipo_unidade'] = escola.get('TIPO DE UNIDADE', '')
            
            resultados['escolas'].append(resultado)
            resultados['total_processadas'] += 1
            
            if resultado['status'] == 'sucesso':
                resultados['total_encontradas'] += len(resultado.get('escolas', []))
            elif resultado['status'] == 'erro':
                resultados['total_erros'] += 1
        
        # Salvar resultados
        try:
            with open(arquivo_saida, 'w', encoding='utf-8') as f:
                json.dump(resultados, f, ensure_ascii=False, indent=2)
            
            logger.info(f"\nResumo:")
            logger.info(f"- Total de escolas processadas: {resultados['total_processadas']}")
            logger.info(f"- Total encontradas no site: {resultados['total_encontradas']}")
            logger.info(f"- Total de erros: {resultados['total_erros']}")
            logger.info(f"Resultados salvos em: {arquivo_saida}")
        
        except Exception as e:
            logger.error(f"Erro ao salvar resultados: {str(e)}")


def main():
    # Caminhos dos arquivos
    arquivo_entrada = r"DadosUnidades.json"
    arquivo_saida = r"ResultadosSEC.json"
    
    # Inicializar scraper
    scraper = ScrapeSecBA()
    
    # Processar todas as escolas
    scraper.processar_todas_escolas(arquivo_entrada, arquivo_saida)


if __name__ == "__main__":
    main()
