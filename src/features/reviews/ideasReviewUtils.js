export const FORM_STORAGE_KEY_PREFIX = 'confera_review_draft_'

export const A1_OPTIONS = [
  { value: 'expert', label: 'Expert in this topic', hint: 'Recherche active et publications directes dans ce domaine spécifique' },
  { value: 'knowledgeable', label: 'Knowledgeable', hint: 'Bonne maîtrise des principes et de la littérature' },
  { value: 'familiar', label: 'Some familiarity', hint: 'Connaissance générale sans être spécialiste' },
  { value: 'outside', label: 'Outside my area', hint: 'Domaine connexe ou éloigné' },
]

export const B3_OPTIONS = [
  { value: 'experiments', label: 'Experiments on real or benchmark data', hint: 'Validation empirique sur données réelles / benchmarks' },
  { value: 'proof', label: 'Formal proof / theoretical analysis', hint: 'Démonstration formelle ou preuve théorique rigoureuse' },
  { value: 'simulation', label: 'Simulation only', hint: 'Simulations numériques sans données réelles' },
  { value: 'case_study', label: 'Case study / application', hint: 'Étude de cas appliquée' },
  { value: 'not_validated', label: 'Not validated', hint: 'Aucune validation convaincante fournie' },
]

export const C2_OPTIONS = [
  { value: 'highly_relevant', label: 'Highly relevant', hint: 'Cœur de cible des thématiques de la conférence' },
  { value: 'relevant', label: 'Relevant', hint: 'En adéquation avec les thèmes et l’audience' },
  { value: 'marginal', label: 'Marginal', hint: 'Pertinence périphérique' },
  { value: 'out_of_scope', label: 'Out of scope', hint: 'Hors thématique' },
]

export const C3_TRACKS = [
  { value: 'ai_ml', label: 'AI & Machine Learning' },
  { value: 'big_data', label: 'Big Data Engineering & Analytics' },
  { value: 'gen_ai', label: 'Generative AI & Foundation Models' },
  { value: 'industry_health', label: 'AI in Industry & Healthcare' },
  { value: 'ethics_security', label: 'Ethics, Privacy & Security in AI' },
  { value: 'emerging_trends', label: 'Emerging Trends & Intelligent Systems' },
]

export const C4_OPTIONS = [
  { value: 'fully_compliant', label: 'Fully compliant', hint: 'Template IEEE respecté, ≤ 6 pages, anonymat double-aveugle strict' },
  { value: 'minor_issues', label: 'Minor issues', hint: 'Écarts mineurs de format sans impact critique' },
  { value: 'major_issues', label: 'Major issues', hint: 'Template non respecté, limite de pages dépassée ou auteurs identifiables' },
]

export const D1_OPTIONS = [
  { value: 'yes', label: 'Yes', hint: 'Sources, vie privée, biais et impact sociétal traités de façon adéquate' },
  { value: 'partially', label: 'Partially', hint: 'Abordé mais nécessite des précisions' },
  { value: 'not_addressed', label: 'Not addressed but needed', hint: 'Non traité alors que le sujet l’exige' },
  { value: 'na', label: 'Not applicable', hint: 'Non applicable pour ce type de travail' },
]

export const D2_OPTIONS = [
  { value: 'yes', label: 'Yes', hint: 'Jeux de données, code, paramètres et protocoles reproductibles' },
  { value: 'partially', label: 'Partially', hint: 'Reproductibilité partielle' },
  { value: 'no', label: 'No', hint: 'Éléments insuffisants pour reproduire les résultats' },
]

export const D3_OPTIONS = [
  { value: 'no_concerns', label: 'No concerns', hint: 'Aucun problème d’intégrité détecté' },
  { value: 'possible_concern', label: 'Possible concern', hint: 'Suspicion de plagiat, double soumission ou IA générative non déclarée (détaillé dans les commentaires confidentiels)' },
]

export const F1_OPTIONS = [
  { value: 'accept', label: 'Accept', desc: 'Article de haute qualité, prêt pour publication sans modification majeure.', color: 'text-ok', bg: 'bg-ok/10 border-ok/40' },
  { value: 'accept_minor', label: 'Accept with minor revisions', desc: 'Accepté sous réserve de corrections mineures vérifiables.', color: 'text-info', bg: 'bg-info/10 border-info/40' },
  { value: 'major_revision', label: 'Major revision', desc: 'Potentiel scientifique mais révision substantielle requise.', color: 'text-warn', bg: 'bg-warn/10 border-warn/40' },
  { value: 'reject', label: 'Reject', desc: 'Hors thématique, méthodologie insuffisante ou faiblesses majeures.', color: 'text-bad', bg: 'bg-bad/10 border-bad/40' },
]

export const F2_FORMATS = [
  { value: 'oral', label: 'Oral presentation' },
  { value: 'poster', label: 'Poster presentation' },
  { value: 'either', label: 'Either (Oral or Poster)' },
]

export const F3_OPTIONS = [
  { value: 'strongly', label: 'Yes, strongly recommended', hint: 'Potentiel exceptionnel pour chapitre étendu IGI Global' },
  { value: 'possibly', label: 'Possibly', hint: 'À considérer selon la version finale' },
  { value: 'no', label: 'No', hint: 'Non retenu pour version étendue' },
]

export const TABS = [
  { id: 'ab', label: '1. Profil & Qualité', subtitle: 'Sections A & B' },
  { id: 'cd', label: '2. Présentation & Éthique', subtitle: 'Sections C & D' },
  { id: 'ef', label: '3. Commentaires & Décision', subtitle: 'Sections E & F' },
]

export function getIdeasLabel(list, val) {
  if (!val) return '—'
  return list.find((o) => o.value === val)?.label || val
}

export function serializeReviewToComments(data) {
  // Supprime strictement e4 (remarques confidentielles pour les chaires) du payload public
  // eslint-disable-next-line no-unused-vars
  const { e4, ...publicData } = data
  const jsonString = JSON.stringify(publicData)
  const report = [
    `# GRILLE D'ÉVALUATION OFFICIELLE IDEAS'2027`,
    `\n## Section A: Reviewer profile`,
    `- A1. Confidence: ${data.a1 || 'Non renseigné'}`,
    `\n## Section B: Scientific quality`,
    `- B1. Originality: ${data.b1}/5`,
    `- B2. Technical soundness: ${data.b2}/5`,
    `- B3. Validation: ${data.b3 || 'Non renseigné'}`,
    `- B4. Conclusions: ${data.b4}/5`,
    `- B5. Related work: ${data.b5}/5`,
    `\n## Section C: Presentation and fit`,
    `- C1. Clarity & organization: ${data.c1}/5`,
    `- C2. Relevance: ${data.c2 || 'Non renseigné'}`,
    `- C3. Main track: ${data.c3 || 'Non renseigné'}`,
    `- C4. Format compliance: ${data.c4 || 'Non renseigné'}`,
    `\n## Section D: Responsible research`,
    `- D1. Ethics & trustworthiness: ${data.d1 || 'Non renseigné'}`,
    `- D2. Reproducibility: ${data.d2 || 'Non renseigné'}`,
    `- D3. Integrity concerns: ${data.d3 || 'No concerns'}`,
    `\n## Section E: Comments for Authors`,
    `### E1. Strengths:\n${data.e1?.trim() || 'Aucun point fort mentionné.'}`,
    `\n### E2. Weaknesses:\n${data.e2?.trim() || 'Aucune faiblesse majeure mentionnée.'}`,
    `\n### E3. Actionable suggestions:\n${data.e3?.trim() || 'Aucune suggestion mentionnée.'}`,
    `\n## Section F: Recommendation`,
    `- F1. Decision: ${data.f1 || 'Non renseigné'}`,
    `- F2. Presentation format: ${data.f2 || 'Non renseigné'}`,
    `- F3. Book chapter potential: ${data.f3 || 'Non renseigné'}`,
    `- F4. Best Paper nomination: ${data.f4 === 'yes' ? 'OUI' : 'NON'}`,
    `- F5. Overall score: ${data.f5}/100`,
    `\n<!-- IDEAS_FORM_JSON: ${jsonString} -->`,
  ].filter(Boolean).join('\n')

  return report
}

export function parseReviewFromComments(comments) {
  if (!comments) return null
  const match = comments.match(/<!-- IDEAS_FORM_JSON: (.*?) -->/)
  if (match && match[1]) {
    try {
      return JSON.parse(match[1])
    } catch {
      return null
    }
  }
  return null
}
