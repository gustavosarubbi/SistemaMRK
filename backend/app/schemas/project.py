from typing import Optional
from pydantic import BaseModel

class ProjectCreate(BaseModel):
    custo: str
    descricao: str
    unidade: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    coordenador: Optional[str] = None
    analista: Optional[str] = None
    departamento: Optional[str] = None
    saldo_inicial: Optional[float] = 0.0
    classe: Optional[str] = "2" # 1=Sintético, 2=Analítico
    bloqueado: Optional[str] = "2" # 1=Sim, 2=Não
