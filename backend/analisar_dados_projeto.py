import logging
from sqlalchemy import func, or_
from app.db.session import SessionLocal
from app.models.protheus import PAD010

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analisar_dados_projeto():
    """Analisa dados reais do projeto 001010170 para estruturar a lógica de matching"""
    
    db = SessionLocal()
    try:
        custo = '001010170'
        
        print("\n" + "=" * 120)
        print(f"ANÁLISE DE DADOS - PROJETO: {custo}")
        print("=" * 120 + "\n")
        
        # ============================================
        # 1. BUSCAR PAD010 (Naturezas)
        # ============================================
        print("1️⃣ TABELA PAD010 (Naturezas)")
        print("-" * 120)
        
        pad_records = db.query(
            PAD010.PAD_NATURE,
            PAD010.PAD_DESCRI,
            PAD010.PAD_CUSTO
        ).filter(
            func.trim(PAD010.PAD_CUSTO) == custo.strip(),
            or_(
                PAD010.D_E_L_E_T_.is_(None),
                PAD010.D_E_L_E_T_ == '',
                PAD010.D_E_L_E_T_ != '*'
            ),
            PAD010.PAD_NATURE.isnot(None)
        ).distinct().all()
        
        print(f"Total de registros PAD010 encontrados: {len(pad_records)}\n")
        
        # Separar por tamanho
        pad_4digits = []  # Mães (4 dígitos)
        pad_8digits = []  # Mães para gastos de itens (8 dígitos)
        pad_other = []
        
        for pad in pad_records:
            pad_nature = str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else ''
            pad_descri = str(pad.PAD_DESCRI).strip() if pad.PAD_DESCRI else ''
            
            if pad_nature:
                if pad_nature.startswith('0001'):
                    continue  # Excluir 0001
                elif len(pad_nature) == 4:
                    pad_4digits.append({
                        'nature': pad_nature,
                        'descri': pad_descri,
                        'int_value': int(pad_nature) if pad_nature.isdigit() else None
                    })
                elif len(pad_nature) == 8:
                    pad_8digits.append({
                        'nature': pad_nature,
                        'descri': pad_descri
                    })
                else:
                    pad_other.append({
                        'nature': pad_nature,
                        'descri': pad_descri,
                        'length': len(pad_nature)
                    })
        
        print(f"📊 PAD_NATURE de 4 dígitos (mães para movimentações): {len(pad_4digits)}")
        for p in sorted(pad_4digits, key=lambda x: x['nature'])[:10]:
            print(f"   - {p['nature']} (int: {p['int_value']}): {p['descri'][:60]}")
        if len(pad_4digits) > 10:
            print(f"   ... e mais {len(pad_4digits) - 10}")
        
        print(f"\n📊 PAD_NATURE de 8 dígitos (mães para gastos de itens): {len(pad_8digits)}")
        for p in sorted(pad_8digits, key=lambda x: x['nature'])[:10]:
            print(f"   - {p['nature']}: {p['descri'][:60]}")
        if len(pad_8digits) > 10:
            print(f"   ... e mais {len(pad_8digits) - 10}")
        
        if pad_other:
            print(f"\n📊 Outros tamanhos: {len(pad_other)}")
            for p in pad_other[:5]:
                print(f"   - {p['nature']} ({p['length']} dígitos): {p['descri'][:60]}")
        
        # ============================================
        # 2. RESUMO E RECOMENDAÇÕES
        # ============================================
        print("\n" + "=" * 120)
        print("2️⃣ RESUMO E RECOMENDAÇÕES")
        print("-" * 120)
        
        print(f"""
📋 RESUMO:
   - PAD_NATURE 4 dígitos: {len(pad_4digits)}
   - PAD_NATURE 8 dígitos: {len(pad_8digits)}

🔍 ANÁLISE:
   - Tabela PAC010 foi removida do sistema
   - Dados de movimentações agora vêm de SE2010
        """)
        
    except Exception as e:
        logger.error(f"Erro ao analisar dados: {e}", exc_info=True)
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    analisar_dados_projeto()

