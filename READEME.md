🔎 GOVBR - Auditoria Inteligente

Sistema de auditoria automatizada para análise de gastos públicos (viagens e diárias), utilizando Inteligência Artificial (LLMs) para detecção de anomalias e conformidade com a base de dados do Governo Federal.
🏗️ Arquitetura do Projeto

Este projeto foi construído seguindo os princípios de Clean Architecture e Domain-Driven Design (DDD), garantindo que a lógica de negócio seja independente de frameworks, interfaces e bancos de dados.

    app/domain: O coração do sistema. Contém as entidades e regras de negócio da auditoria, independentes de tecnologia externa.

    app/services: Orquestração da lógica. Onde os casos de uso (como "auditar processo") são executados.

    app/infrastructure: Implementações técnicas. Contém o cliente da Groq (LLM), geração de Embeddings e motores de busca de dados.

    app/schemas: Definições de entrada e saída (Pydantic), garantindo integridade de dados e validação de contratos da API.

    app/routers: Camada de interface (API), expondo os serviços via FastAPI.

    static: Frontend moderno e reativo construído com JavaScript puro, implementando um fluxo de State Management customizado.

🛠️ Stack Tecnológica

    Linguagem: Python 3.13 / 3.14

    Framework API: FastAPI (Uvicorn como ASGI Server)

    Motor de IA: Groq API (Llama 3 / Mixtral) para análise crítica.

    Processamento: Polars (High-performance data manipulation).

    Frontend: Vanilla JS com arquitetura de Controllers e Store.

    Infraestrutura: Azure Data Lake (Armazenamento de dados em Parquet).

🚀 Como Executar
Pré-requisitos

    Python 3.13+ instalado.

    Chave de API da Groq e credenciais Azure configuradas no .env.

Instalação

    Clone o repositório:
    Bash

    git clone https://github.com/rogeriosprf/GOVBR-Auditoria-App.git

    Instale as dependências:
    Bash

    pip install -r requirements.txt

    Inicie o servidor:
    Bash

    python main.py

    O sistema estará disponível em http://localhost:8000.

📈 Diferenciais Técnicos

    Análise Semântica: O sistema não busca apenas valores numéricos, mas utiliza LLMs para entender o contexto das justificativas de viagem e identificar inconsistências éticas ou legais.

    Performance: Integração nativa com Polars para lidar com grandes volumes de dados governamentais com baixo footprint de memória (ideal para o ambiente local H81).

    Modularidade: A separação em camadas permite trocar o provedor de IA ou o banco de dados sem tocar na regra de negócio de auditoria.

Desenvolvido por Rogério - Engenheiro de Dados & Desenvolvedor Fullstack.