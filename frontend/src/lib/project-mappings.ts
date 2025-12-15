export const PROJECT_CLASSIFICATION_MAP: Record<string, string> = {
  '1': 'Governamental',
  '2': 'Federal',
  '3': 'Privado',
  '4': 'Gestora',
  '5': 'Concursos',
  '6': 'Centro de Custo',
};

export const SERVICE_TYPE_MAP: Record<string, string> = {
  '1': 'Convenio',
  '2': 'Contrato',
  '3': 'Termo Cooperacao Tecnica',
  '4': 'Cursos',
  '5': 'Concursos',
  '6': 'Seminario',
  '7': 'P e D',
  '8': 'Processo Seletivo',
  '9': 'Outros',
};

export const getProjectClassification = (code?: string) => {
  if (!code) return 'Não classificado';
  return PROJECT_CLASSIFICATION_MAP[code] || code;
};

export const getServiceType = (code?: string) => {
  if (!code) return 'Não definido';
  return SERVICE_TYPE_MAP[code] || code;
};

/**
 * Obtém o nome do analista do projeto
 * Verifica primeiro CTT_ANADES, depois CTT_ANALIS
 */
export const getProjectAnalyst = (project?: { CTT_ANADES?: string; CTT_ANALIS?: string } | null): string => {
  if (!project) return '-';
  const analyst = (project.CTT_ANADES || project.CTT_ANALIS || '').trim();
  return analyst || '-';
};







