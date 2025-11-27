# SistemaMRK - Dashboard de Projetos Financeiros

Sistema completo para sincronização de dados e visualização de projetos financeiros através de um dashboard moderno.

## Estrutura do Projeto

```
SistemaMRK/
├── backend/          # Backend Python (sincronização + API)
│   ├── api/         # API FastAPI
│   └── sync_tables.py
└── frontend/         # Frontend Next.js
```

## Funcionalidades

### Backend
- **Sincronização de Dados**: Sincroniza tabelas do banco remoto para o banco local
- **API REST**: API FastAPI com autenticação JWT
- **Endpoints**: Projetos, Dashboard, Movimentações Financeiras

### Frontend
- **Dashboard Interativo**: Visualização de projetos com gráficos e tabelas
- **Autenticação**: Sistema de login seguro
- **Tempo Real**: Atualização automática a cada 30 segundos
- **Filtros Avançados**: Por período, tipo de projeto, cliente, etc.
- **Visualizações**: Gráficos de orçado vs realizado, KPIs, tabelas interativas

## Instalação

### Pré-requisitos

- Python 3.14+
- Node.js 22+
- SQL Server com ODBC Driver 17
- Banco de dados local configurado

### Backend

1. Instale as dependências Python (garantindo uso do Python 3.14):
```bash
# Criar ambiente virtual com Python 3.14
py -3.14 -m venv .venv

# Ativar ambiente virtual (PowerShell)
. .venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt
```

2. Configure o arquivo `.env` na raiz do projeto:

```env
# Configurações do Banco de Dados Remoto (MSSQL)
DB_SERVER=10.10.24.65
DB_PORT=1433
DB_USER=SIGA
DB_PASSWORD=SIGA
DB_NAME=P122210_TST
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Configurações do Banco de Dados Local (MSSQL)
LOCAL_DB_SERVER=localhost
LOCAL_DB_PORT=1433
LOCAL_DB_USER=admin
LOCAL_DB_PASSWORD=admin
LOCAL_DB_NAME=SistemaMRK_Local
LOCAL_DB_ENCRYPT=false
LOCAL_DB_TRUST_SERVER_CERTIFICATE=true

# JWT Secret Key (altere em produção)
JWT_SECRET_KEY=your-secret-key-change-in-production
```

3. Sincronize as tabelas:
```bash
python backend/sync_tables.py
```

4. Inicie a API:
```bash
python backend/run_api.py
```

A API estará disponível em `http://localhost:8000`

### Frontend

1. Navegue até a pasta frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O dashboard estará disponível em `http://localhost:3000`

## Uso

### Sincronização de Dados

Execute o script de sincronização periodicamente para manter os dados atualizados:

```bash
python backend/sync_tables.py
```

### Acessando o Dashboard

1. Acesse `http://localhost:3000`
2. Faça login com as credenciais padrão:
   - **Usuário**: `admin`
   - **Senha**: `admin`
3. Navegue pelos projetos e visualize os dados

## Tabelas Sincronizadas

### PAD010
Tabela de dados do sistema.

### CTT010
Tabela de Centros de Custo e Projetos. Principais campos:

| Campo | Descrição | Observação |
|-------|-----------|------------|
| CTT_CUSTO | Centro de Custo | |
| CTT_DESC01 | Nome do Projeto | |
| CTT_DTINI | Vigência Início | |
| CTT_DTFIM | Vigência Fim | |
| CTT_UNIDES | Cliente | |
| CTT_DEPDES | Descrição Pró-Reitoria | |
| CTT_DEPART | Pró-Reitoria (Código) | Só no caso da UEA |
| CTT_DESTIP | Tipo de Projeto | |
| CTT_SALINI | Saldo Orçamentário ou Valor Global | |
| CTT_NOMORG | Órgão Financiador | |
| CTT_ANALIST | Analista do Projeto | |
| CTT_NOMECO | Coordenador do Projeto | |

### PAC010
Tabela de movimentações financeiras.

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual
- `POST /api/auth/logout` - Logout

### Projetos
- `GET /api/projects` - Lista de projetos (com filtros)
- `GET /api/projects/{custo}` - Detalhes do projeto
- `GET /api/projects/{custo}/budget` - Dados orçamentários

### Dashboard
- `GET /api/dashboard/summary` - Resumo geral
- `GET /api/dashboard/kpis` - KPIs agregados

### Movimentações
- `GET /api/movements/{custo}` - Movimentações do projeto (com filtros)

## Solução de Problemas

### Erro: Banco de dados sem espaço em disco

Se você encontrar o erro "Não foi possível alocar espaço":

1. **Verifique o espaço disponível:**
```bash
python backend/check_database.py
```

2. **Aumente o tamanho do banco de dados:**
```sql
ALTER DATABASE [SistemaMRK_Local]
MODIFY FILE (
    NAME = 'SistemaMRK_Local',
    SIZE = 500MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 100MB
)
```

### Erro de conexão com a API

Verifique se:
- A API está rodando na porta 8000
- O arquivo `.env.local` do frontend está configurado corretamente
- Não há problemas de CORS (a API já está configurada para aceitar requisições do frontend)

## Tecnologias Utilizadas

### Backend
- FastAPI
- pyodbc
- python-jose (JWT)
- passlib (hash de senhas)

### Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui
- Recharts
- React Query
- Zustand

## Desenvolvimento

Para desenvolvimento, ambos os servidores (backend e frontend) devem estar rodando simultaneamente.

## Licença

Este projeto é privado e de uso interno.
