"""
Script para analisar dados reais das tabelas PAD010 e PAC010
e estruturar a lógica FIXA de matching entre PAD_NATURE e PAC_SUBRUB.
"""
import sys
import os
from sqlalchemy import func, or_

# Adiciona o diretório atual ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.protheus import PAD010

def analisar_matching():
    """Analisa dados reais e estrutura lógica fixa de matching"""
    
    db = SessionLocal()
    try:
        custo = '001010170'  # Custo do exemplo
        
        print("=" * 100)
        print("ANÁLISE DE DADOS REAIS - PAD010 e PAC010")
        print(f"CUSTO: {custo}")
        print("=" * 100)
        
        # ============================================
        # 1. CONSULTAR PAD010
        # ============================================
        print("\n" + "=" * 100)
        print("1. TABELA PAD010")
        print("=" * 100)
        
        # Tentar sem trim primeiro
        pad_all = db.query(
            PAD010.PAD_NATURE,
            PAD010.PAD_DESCRI,
            PAD010.PAD_CUSTO,
            PAD010.D_E_L_E_T_
        ).filter(
            PAD010.PAD_CUSTO == custo
        ).all()
        
        # Se não encontrar, tentar com trim
        if len(pad_all) == 0:
            pad_all = db.query(
                PAD010.PAD_NATURE,
                PAD010.PAD_DESCRI,
                PAD010.PAD_CUSTO,
                PAD010.D_E_L_E_T_
            ).filter(
                func.trim(PAD010.PAD_CUSTO) == custo
            ).all()
        
        print(f"\nTotal de registros PAD010 para custo {custo}: {len(pad_all)}")
        
        # Separar por status de deletado
        pad_ativos = [p for p in pad_all if not p.D_E_L_E_T_ or p.D_E_L_E_T_ != '*']
        pad_deletados = [p for p in pad_all if p.D_E_L_E_T_ == '*']
        
        print(f"  - Ativos: {len(pad_ativos)}")
        print(f"  - Deletados: {len(pad_deletados)}")
        
        # Analisar PAD_NATURE
        print("\n📊 ANÁLISE DE PAD_NATURE:")
        print("-" * 100)
        
        natures_unicas = {}
        for pad in pad_ativos:
            nature = str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else ''
            if nature:
                if nature not in natures_unicas:
                    natures_unicas[nature] = {
                        'nature': nature,
                        'length': len(nature),
                        'descri': pad.PAD_DESCRI or '',
                        'count': 0
                    }
                natures_unicas[nature]['count'] += 1
        
        # Separar mães (4 dígitos) e filhos (mais de 4)
        mothers = []
        children = []
        nature_0001 = []
        
        for nature, data in natures_unicas.items():
            if data['nature'].startswith('0001'):
                nature_0001.append(data)
            elif len(data['nature']) == 4:
                mothers.append(data)
            elif len(data['nature']) > 4:
                children.append(data)
        
        print(f"\nMães (4 dígitos, exceto 0001): {len(mothers)}")
        for m in sorted(mothers, key=lambda x: x['nature'])[:10]:
            print(f"  - {m['nature']}: {m['descri'][:50]} (count: {m['count']})")
        
        print(f"\nFilhos (>4 dígitos, exceto 0001): {len(children)}")
        for c in sorted(children, key=lambda x: x['nature'])[:10]:
            print(f"  - {c['nature']}: {c['descri'][:50]} (count: {c['count']})")
        
        print(f"\nNatures que começam com 0001 (excluir): {len(nature_0001)}")
        for n in sorted(nature_0001, key=lambda x: x['nature'])[:5]:
            print(f"  - {n['nature']}: {n['descri'][:50]}")
        
        # ============================================
        # 2. CONSULTAR PAC010
        # ============================================
        print("\n" + "=" * 100)
        print("2. TABELA PAC010")
        print("=" * 100)
        
        # Tentar sem trim primeiro
        pac_all = db.query(
            PAC010.PAC_SUBRUB,
            PAC010.PAC_HISTOR,
            PAC010.PAC_DATA,
            PAC010.PAC_VALOR,
            PAC010.PAC_CUSTO,
            PAC010.D_E_L_E_T_
        ).filter(
            PAC010.PAC_CUSTO == custo
        ).all()
        
        # Se não encontrar, tentar com trim
        if len(pac_all) == 0:
            pac_all = db.query(
                PAC010.PAC_SUBRUB,
                PAC010.PAC_HISTOR,
                PAC010.PAC_DATA,
                PAC010.PAC_VALOR,
                PAC010.PAC_CUSTO,
                PAC010.D_E_L_E_T_
            ).filter(
                func.trim(PAC010.PAC_CUSTO) == custo
            ).all()
        
        # Se ainda não encontrar, verificar todos os custos únicos na PAC010
        if len(pac_all) == 0:
            print(f"\n⚠️ Nenhum registro encontrado com custo '{custo}'")
            print("Verificando se há dados na PAC010...")
            total_pac = db.query(PAC010).count()
            print(f"Total de registros na PAC010: {total_pac}")
            
            if total_pac > 0:
                print("\nVerificando todos os custos únicos na PAC010...")
                all_custos = db.query(PAC010.PAC_CUSTO).distinct().limit(20).all()
                print(f"Primeiros 20 custos únicos na PAC010:")
                for c in all_custos:
                    if c.PAC_CUSTO:
                        custo_str = str(c.PAC_CUSTO).strip()
                        count = db.query(PAC010).filter(PAC010.PAC_CUSTO == c.PAC_CUSTO).count()
                        print(f"  - '{custo_str}' ({len(custo_str)} chars): {count} registros")
                
                # Pegar alguns exemplos de PAC010 para análise
                print("\n📋 Exemplos de registros PAC010 (primeiros 10):")
                pac_samples = db.query(
                    PAC010.PAC_CUSTO,
                    PAC010.PAC_SUBRUB,
                    PAC010.PAC_HISTOR,
                    PAC010.PAC_DATA,
                    PAC010.PAC_VALOR
                ).limit(10).all()
                
                for i, pac in enumerate(pac_samples, 1):
                    print(f"\n{i}. CUSTO: '{pac.PAC_CUSTO}' | SUBRUB: '{pac.PAC_SUBRUB}' | HISTOR: {pac.PAC_HISTOR[:50] if pac.PAC_HISTOR else ''}")
                    print(f"   DATA: {pac.PAC_DATA} | VALOR: {pac.PAC_VALOR}")
            else:
                print("❌ A tabela PAC010 está vazia!")
        
        print(f"\nTotal de registros PAC010 para custo {custo}: {len(pac_all)}")
        
        # Separar por status de deletado
        pac_ativos = [p for p in pac_all if not p.D_E_L_E_T_ or p.D_E_L_E_T_ != '*']
        pac_deletados = [p for p in pac_all if p.D_E_L_E_T_ == '*']
        
        print(f"  - Ativos: {len(pac_ativos)}")
        print(f"  - Deletados: {len(pac_deletados)}")
        
        # Analisar PAC_SUBRUB
        print("\n📊 ANÁLISE DE PAC_SUBRUB:")
        print("-" * 100)
        
        subrubs_unicos = {}
        for pac in pac_ativos:
            subrub = str(pac.PAC_SUBRUB).strip() if pac.PAC_SUBRUB else ''
            if subrub:
                if subrub not in subrubs_unicos:
                    subrubs_unicos[subrub] = {
                        'subrub': subrub,
                        'length': len(subrub),
                        'histor': pac.PAC_HISTOR or '',
                        'count': 0,
                        'total_valor': 0.0
                    }
                subrubs_unicos[subrub]['count'] += 1
                subrubs_unicos[subrub]['total_valor'] += abs(float(pac.PAC_VALOR) if pac.PAC_VALOR else 0.0)
        
        # Agrupar por tamanho
        subrubs_by_length = {}
        for subrub, data in subrubs_unicos.items():
            length = data['length']
            if length not in subrubs_by_length:
                subrubs_by_length[length] = []
            subrubs_by_length[length].append(data)
        
        print(f"\nDistribuição por tamanho de PAC_SUBRUB:")
        for length in sorted(subrubs_by_length.keys()):
            print(f"  - {length} dígitos: {len(subrubs_by_length[length])} valores únicos")
            for s in sorted(subrubs_by_length[length], key=lambda x: x['subrub'])[:5]:
                print(f"    * {s['subrub']}: {s['histor'][:50]} (count: {s['count']}, total: R$ {s['total_valor']:,.2f})")
        
        # ============================================
        # 3. TENTAR MATCHING
        # ============================================
        print("\n" + "=" * 100)
        print("3. ANÁLISE DE MATCHING - PAD_NATURE vs PAC_SUBRUB")
        print("=" * 100)
        
        # Criar lista de natures válidas (excluindo 0001)
        valid_natures = []
        for m in mothers:
            valid_natures.append(m['nature'])
        for c in children:
            valid_natures.append(c['nature'])
        
        print(f"\nTotal de PAD_NATURE válidos (excluindo 0001): {len(valid_natures)}")
        print(f"Total de PAC_SUBRUB únicos: {len(subrubs_unicos)}")
        
        # Tentar matching
        matches_found = {}
        no_matches = []
        
        for subrub, data in subrubs_unicos.items():
            matched = False
            matching_natures = []
            
            for nature in valid_natures:
                # Teste 1: PAC_SUBRUB começa com PAD_NATURE?
                if subrub.startswith(nature):
                    matching_natures.append({
                        'nature': nature,
                        'type': 'starts_with',
                        'match': True
                    })
                    matched = True
                # Teste 2: PAC_SUBRUB é igual a PAD_NATURE?
                elif subrub == nature:
                    matching_natures.append({
                        'nature': nature,
                        'type': 'exact',
                        'match': True
                    })
                    matched = True
                # Teste 3: PAD_NATURE está contido em PAC_SUBRUB?
                elif nature in subrub:
                    matching_natures.append({
                        'nature': nature,
                        'type': 'contains',
                        'match': True
                    })
                    matched = True
            
            if matched:
                matches_found[subrub] = {
                    'subrub': subrub,
                    'histor': data['histor'],
                    'matches': matching_natures
                }
            else:
                no_matches.append({
                    'subrub': subrub,
                    'histor': data['histor']
                })
        
        print(f"\n✅ MATCHES ENCONTRADOS: {len(matches_found)}")
        print(f"❌ SEM MATCH: {len(no_matches)}")
        
        # Mostrar exemplos de matches
        print("\n📋 EXEMPLOS DE MATCHES (primeiros 10):")
        print("-" * 100)
        for i, (subrub, match_data) in enumerate(list(matches_found.items())[:10]):
            print(f"\n{i+1}. PAC_SUBRUB: {subrub}")
            print(f"   HISTOR: {match_data['histor'][:60]}")
            for match in match_data['matches'][:3]:  # Mostrar até 3 matches
                print(f"   → Match com PAD_NATURE '{match['nature']}' (tipo: {match['type']})")
        
        # Mostrar exemplos sem match
        if no_matches:
            print("\n⚠️ EXEMPLOS SEM MATCH (primeiros 10):")
            print("-" * 100)
            for i, no_match in enumerate(no_matches[:10]):
                print(f"{i+1}. PAC_SUBRUB: {no_match['subrub']} | HISTOR: {no_match['histor'][:60]}")
        
        # ============================================
        # 4. ESTRUTURAR LÓGICA FIXA
        # ============================================
        print("\n" + "=" * 100)
        print("4. LÓGICA FIXA RECOMENDADA")
        print("=" * 100)
        
        # Analisar padrão mais comum
        match_types_count = {}
        for match_data in matches_found.values():
            for match in match_data['matches']:
                match_type = match['type']
                match_types_count[match_type] = match_types_count.get(match_type, 0) + 1
        
        print(f"\nTipos de matching encontrados:")
        for match_type, count in sorted(match_types_count.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {match_type}: {count} matches")
        
        # Determinar lógica fixa
        if match_types_count.get('starts_with', 0) > match_types_count.get('exact', 0):
            print("\n✅ LÓGICA RECOMENDADA: PAC_SUBRUB.startswith(PAD_NATURE)")
            print("   - Verificar se PAC_SUBRUB começa com PAD_NATURE")
            print("   - Priorizar matches mais longos (filhos antes de mães)")
        else:
            print("\n✅ LÓGICA RECOMENDADA: PAC_SUBRUB == PAD_NATURE ou PAC_SUBRUB.startswith(PAD_NATURE)")
        
        # Mostrar estrutura de código recomendada
        print("\n📝 ESTRUTURA DE CÓDIGO RECOMENDADA:")
        print("-" * 100)
        print("""
# 1. Buscar PAD_NATURE válidos (excluindo 0001 e derivados)
pad_natures = db.query(PAD010.PAD_NATURE).filter(
    func.trim(PAD010.PAD_CUSTO) == custo,
    or_(PAD010.D_E_L_E_T_.is_(None), PAD010.D_E_L_E_T_ == '', PAD010.D_E_L_E_T_ != '*'),
    PAD010.PAD_NATURE.isnot(None),
    ~func.trim(PAD010.PAD_NATURE).like('0001%')
).distinct().all()

valid_natures = [str(n.PAD_NATURE).strip() for n in pad_natures 
                 if n.PAD_NATURE and not str(n.PAD_NATURE).strip().startswith('0001')]

# 2. Buscar PAC010
pac_records = db.query(PAC010).filter(
    func.trim(PAC010.PAC_CUSTO) == custo,
    or_(PAC010.D_E_L_E_T_.is_(None), PAC010.D_E_L_E_T_ == '', PAC010.D_E_L_E_T_ != '*'),
    PAC010.PAC_SUBRUB.isnot(None),
    PAC010.PAC_DATA.isnot(None),
    PAC010.PAC_VALOR.isnot(None)
).all()

# 3. Filtrar: PAC_SUBRUB deve começar com algum PAD_NATURE válido
# ORDENAR natures por tamanho (maior primeiro) para priorizar matches mais específicos
valid_natures_sorted = sorted(valid_natures, key=len, reverse=True)

filtered_pac = []
for pac in pac_records:
    pac_subrub = str(pac.PAC_SUBRUB).strip()
    for nature in valid_natures_sorted:  # Testar do maior para o menor
        if pac_subrub.startswith(nature):
            filtered_pac.append(pac)
            break
        """)
        
        print("\n" + "=" * 100)
        print("ANÁLISE CONCLUÍDA")
        print("=" * 100)
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    analisar_matching()

