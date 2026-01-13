from sqlalchemy import Column, String, Float, Date, Integer, Numeric
from app.models.base import Base

class CTT010(Base):
    __tablename__ = "CTT010"
    
    # Assuming CTT_CUSTO is unique/PK in the source context
    CTT_CUSTO = Column(String(50), primary_key=True, index=True)
    CTT_DESC01 = Column(String(200))
    CTT_DTINI = Column(String(8)) # Protheus dates are often strings YYYYMMDD
    CTT_DTFIM = Column(String(8))
    CTT_DTENC = Column(String(8)) # Data de encerramento do projeto
    CTT_UNIDES = Column(String(100))
    CTT_DEPDES = Column(String(200))
    CTT_DEPART = Column(String(50))
    CTT_DESTIP = Column(String(50))
    CTT_SALINI = Column(Float)
    CTT_NOMORG = Column(String(100))
    CTT_ANALIS = Column(String(100))
    CTT_ANADES = Column(String(100)) # Nome do Analista
    CTT_COORDE = Column(String(100)) # Código do Coordenador
    CTT_NOMECO = Column(String(100)) # Nome do Coordenador
    
    CTT_BLOQ = Column(String(1))
    CTT_CLASSE = Column(String(1))
    CTT_CLAPRJ = Column(String(10)) # Classificacao do Projeto
    CTT_TPCONV = Column(String(10)) # Tipo de Prestacao

    # Metadata fields for sync - Removed as we use SYNC_CONTROL table now
    # SYNC_LAST_UPDATE = Column(String(20), nullable=True)

class PAD010(Base):
    __tablename__ = "PAD010"
    
    R_E_C_N_O_ = Column(Integer, primary_key=True, autoincrement=False)
    D_E_L_E_T_ = Column(String(1))
    
    PAD_APAGAR = Column(Float)
    PAD_CUSTO = Column(String(50))
    PAD_DESCRI = Column(String(100))
    PAD_FILIAL = Column(String(2))
    PAD_NATURE = Column(String(10))
    PAD_ORCADO = Column(Float)
    PAD_PREVIS = Column(Float)
    PAD_REALIZ = Column(Float)
    PAD_SALDO = Column(Float)
    PAD_SEQUEN = Column(String(3))
    PAD_USERGA = Column(String(17))
    PAD_USERGI = Column(String(17))

class SC6010(Base):
    __tablename__ = "SC6010"
    
    R_E_C_N_O_ = Column(Integer, primary_key=True, autoincrement=False)
    D_E_L_E_T_ = Column(String(1))
    
    C6_FILIAL = Column(String(2))
    C6_CUSTO = Column(String(50), index=True)  # ID Projeto
    C6_PRCVEN = Column(Float)  # Valor da Parcela
    C6_VALOR = Column(Float)   # Valor Total (requested field)
    C6_ITEM = Column(String(10))  # Número Parcela
    C6_SERIE = Column(String(3))  # Série (condicional - se vazio, não somar)
    C6_NOTA = Column(String(9))  # Nota (condicional - se vazio, não somar)
    C6_DATFAT = Column(String(8))  # Data de Faturamento (formato YYYYMMDD)
    C6_DESCRI = Column(String(200))  # Descrição da Parcela

class SE1010(Base):
    __tablename__ = "SE1010"
    
    R_E_C_N_O_ = Column(Integer, primary_key=True, autoincrement=False)
    D_E_L_E_T_ = Column(String(1))
    
    E1_FILIAL = Column(String(2))
    E1_CUSTO = Column(String(50), index=True) # ID Projeto
    E1_VALOR = Column(Float)
    E1_BAIXA = Column(String(8)) # Data de Baixa
    E1_NUM = Column(String(9), index=True) # Número da Nota

class SE2010(Base):
    __tablename__ = "SE2010"
    
    R_E_C_N_O_ = Column(Integer, primary_key=True, autoincrement=False)
    D_E_L_E_T_ = Column(String(1))
    
    E2_FILIAL = Column(String(2))
    E2_CUSTO = Column(String(50), index=True)  # ID Projeto
    E2_VALOR = Column(Float)  # Valor do Realizado
    E2_RUBRIC = Column(String(3))  # Conexão mãe-filho (equivalente a PAC_RUBRIC)
    E2_SUBRUB = Column(String(3))  # Conexão filho-filho (equivalente a PAC_SUBRUB)
    E2_EMISSAO = Column(String(8))  # Data de Emissão (formato YYYYMMDD)
    E2_BAIXA = Column(String(8))  # Data de Baixa (formato YYYYMMDD)
    E2_NOMEFOR = Column(String(200))  # Nome do Fornecedor/Histórico (para filhos dos filhos)

