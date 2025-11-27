from sqlalchemy import Column, String, Float, Date, Integer
from app.models.base import Base

class CTT010(Base):
    __tablename__ = "CTT010"
    
    # Assuming CTT_CUSTO is unique/PK in the source context
    CTT_CUSTO = Column(String(50), primary_key=True, index=True)
    CTT_DESC01 = Column(String(200))
    CTT_DTINI = Column(String(8)) # Protheus dates are often strings YYYYMMDD
    CTT_DTFIM = Column(String(8))
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

    # Metadata fields for sync - Removed as we use SYNC_CONTROL table now
    # SYNC_LAST_UPDATE = Column(String(20), nullable=True)

class PAC010(Base):
    __tablename__ = "PAC010"
    
    # We need a PK for local storage, Protheus tables usually have R_E_C_N_O_
    # Disable autoincrement to allow inserting explicit values from remote
    R_E_C_N_O_ = Column(Integer, primary_key=True, autoincrement=False)
    D_E_L_E_T_ = Column(String(1))
    
    PAC_FILIAL = Column(String(2))
    PAC_CUSTO = Column(String(50), index=True)
    PAC_DATA = Column(String(8))
    PAC_VALOR = Column(Float)
    PAC_HISTOR = Column(String(200))
    PAC_TIPO = Column(String(10))
    PAC_CLIFOR = Column(String(6))
    PAC_DEBCRD = Column(String(1))
    PAC_DOCUME = Column(String(9))
    PAC_FILORI = Column(String(2))
    PAC_LOJA = Column(String(2))
    PAC_ORIGEM = Column(String(10))
    PAC_PARCEL = Column(String(2))
    PAC_RECPAG = Column(String(1))
    PAC_RUBRIC = Column(String(3))
    PAC_SEQ = Column(String(2))
    PAC_SEQMOV = Column(String(6))
    PAC_SEQUEN = Column(String(3))
    PAC_SERIE = Column(String(3))
    PAC_STATUS = Column(String(1))
    PAC_SUBRUB = Column(String(3))
    PAC_USERGA = Column(String(17))
    PAC_USERGI = Column(String(17))
    PAC_VALDES = Column(Float)
    PAC_VLJURO = Column(Float)
    PAC_VLMULT = Column(Float)
    
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

