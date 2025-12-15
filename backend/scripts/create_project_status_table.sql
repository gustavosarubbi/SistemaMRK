-- Script para criar a tabela PROJECT_STATUS
-- Esta tabela armazena o status de finalização dos projetos

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PROJECT_STATUS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PROJECT_STATUS] (
        [CTT_CUSTO] NVARCHAR(50) NOT NULL PRIMARY KEY,
        [is_finalized] BIT NOT NULL DEFAULT 0,
        [finalized_at] DATETIME2 NULL,
        [finalized_by] NVARCHAR(100) NULL,
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    
    CREATE INDEX [IX_PROJECT_STATUS_is_finalized] ON [dbo].[PROJECT_STATUS] ([is_finalized]);
    
    PRINT 'Tabela PROJECT_STATUS criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela PROJECT_STATUS já existe.';
END



