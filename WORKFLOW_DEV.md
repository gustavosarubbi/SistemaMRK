# Workflow de Desenvolvimento Local (`workflow_dev`) – SistemaMRK

Este documento detalha o fluxo de trabalho para desenvolvimento local no SistemaMRK, utilizando as versões mais recentes das ferramentas (Python 3.14+ e Node.js 22+).

## 1. Pré-requisitos de Ambiente

Certifique-se de ter as seguintes versões instaladas e acessíveis no seu terminal (PowerShell):

### Python (Backend)
- **Versão Exigida**: Python 3.14+
- **Comando de verificação**:
  ```powershell
  py -3.14 --version
  ```
  *Se este comando falhar, instale o Python 3.14 mais recente.*

### Node.js (Frontend)
- **Versão Exigida**: Node.js 22+
- **Comando de verificação**:
  ```powershell
  node -v
  npm -v
  ```
  *Espera-se `v22.x.x` ou superior para o Node.*

---

## 2. Configuração Inicial (Primeira Vez)

### 2.1. Backend (Python 3.14)

1. **Navegue até a raiz do projeto**:
   ```powershell
   cd C:\Users\gustavo.balieiro\Documents\SistemaMRK
   ```

2. **Crie o Ambiente Virtual (venv)** forçando a versão 3.14:
   ```powershell
   py -3.14 -m venv .venv
   ```

3. **Ative o Ambiente Virtual**:
   ```powershell
   . .venv\Scripts\Activate.ps1
   ```

4. **Instale as dependências**:
   ```powershell
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Configure o arquivo `.env`**:
   Crie um arquivo chamado `.env` na raiz do projeto com o seguinte conteúdo (ajuste as credenciais conforme seu ambiente):

   ```env
   # Banco Remoto (Origem)
   DB_SERVER=10.10.24.65
   DB_PORT=1433
   DB_USER=SIGA
   DB_PASSWORD=SIGA
   DB_NAME=P122210_TST
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true

   # Banco Local (Destino)
   LOCAL_DB_SERVER=localhost
   LOCAL_DB_PORT=1433
   LOCAL_DB_USER=admin
   LOCAL_DB_PASSWORD=admin
   LOCAL_DB_NAME=SistemaMRK_Local
   LOCAL_DB_ENCRYPT=false
   LOCAL_DB_TRUST_SERVER_CERTIFICATE=true

   # Segurança
   JWT_SECRET_KEY=chave-secreta-desenvolvimento
   ```

6. **Prepare o Banco de Dados Local**:
   Certifique-se de que o banco `SistemaMRK_Local` existe no seu SQL Server local. Se necessário, aumente o tamanho inicial do banco para evitar erros de espaço.

### 2.2. Frontend (Next.js / Node 22+)

1. **Navegue até a pasta do frontend**:
   ```powershell
   cd frontend
   ```

2. **Instale as dependências**:
   ```powershell
   npm install
   ```

3. **Configure o arquivo `.env.local`**:
   Crie um arquivo chamado `.env.local` na pasta `frontend` com:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

---

## 3. Rotina Diária de Desenvolvimento

Siga esta ordem para iniciar o projeto corretamente.

### Passo 1: Ativar Backend e Sincronizar Dados

1. Abra um terminal (PowerShell) na raiz do projeto.
2. Ative o ambiente virtual:
   ```powershell
   . .venv\Scripts\Activate.ps1
   ```
3. **(Opcional)** Sincronize os dados do banco remoto para o local:
   ```powershell
   python backend/sync_tables.py
   ```
   *Nota: Como o venv está ativo, `python` referenciará o Python 3.14 do ambiente.*

### Passo 2: Iniciar a API Backend

No mesmo terminal onde ativou o venv:

```powershell
python backend/run_api.py
```
- A API iniciará em `http://localhost:8000`.
- Documentação (Swagger) disponível em: `http://localhost:8000/docs`.

### Passo 3: Iniciar o Frontend

1. Abra um **novo terminal** (PowerShell).
2. Vá para a pasta do frontend:
   ```powershell
   cd frontend
   ```
3. Inicie o servidor de desenvolvimento:
   ```powershell
   npm run dev
   ```
- O dashboard estará acessível em: `http://localhost:3000`.

---

## 4. Troubleshooting (Solução de Problemas)

### Erro de Versão do Python
Se você ver erros de sintaxe ou compatibilidade, verifique se o Python correto está ativo:
```powershell
python --version
```
Deve retornar `Python 3.14.x`. Se retornar outra versão, certifique-se de ter ativado o venv (`. .venv\Scripts\Activate.ps1`).

### Erro "Não foi possível alocar espaço" (SQL Server)
Se a sincronização falhar por falta de espaço no banco:
1. Execute o script de verificação (se disponível):
   ```powershell
   python backend/check_database.py
   ```
2. Aumente o tamanho do arquivo do banco via SQL Management Studio ou comando SQL.

### Frontend não conecta na API
- Verifique se a API está rodando na porta 8000.
- Confirme se `NEXT_PUBLIC_API_URL` no `.env.local` está exatamente `http://localhost:8000`.
- Verifique o console do navegador (F12) para erros de rede.





