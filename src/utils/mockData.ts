export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  points: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  group_id: string | null;
  author_id: string;
  created_at: string;
  author?: Profile;
  group_name?: string;
  answers_count?: number;
}

export interface Answer {
  id: string;
  question_id: string;
  content: string;
  author_id: string;
  is_accepted: boolean;
  created_at: string;
  author?: Profile;
  upvotes_count: number;
  has_upvoted?: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  category: string;
  pdf_url: string;
}

// 1. MOCK PROFILES
export const mockProfiles: Profile[] = [
  {
    id: 'user-1',
    username: 'MarieCurie_99',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=marie',
    points: 1540,
  },
  {
    id: 'user-2',
    username: 'LinusPauling',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=linus',
    points: 920,
  },
  {
    id: 'user-3',
    username: 'Lavoisier_Chem',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=antoine',
    points: 430,
  },
  {
    id: 'user-4',
    username: 'Mendeleev_Periodic',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=dmitri',
    points: 2110,
  },
];

// 2. MOCK GROUPS
export const mockGroups: Group[] = [
  {
    id: 'group-organic',
    name: 'OrganicChemistry',
    description: 'Discussion on Carbon compounds, synthesis pathways, mechanism analyses, and NMR spectroscopy.',
    created_by: 'user-2',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'group-inorganic',
    name: 'InorganicCoordination',
    description: 'Focusing on organometallics, transition metals, ligand field theory, and crystal structures.',
    created_by: 'user-4',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'group-physical',
    name: 'PhysicalKinetics',
    description: 'Quantum mechanics, chemical thermodynamics, kinetics, rate laws, and statistical mechanics.',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'group-analytical',
    name: 'AnalyticalSpectra',
    description: 'Chromatography, mass spectrometry, titration, and modern chemical analysis methodologies.',
    created_by: 'user-3',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// 3. MOCK QUESTIONS
export const mockQuestions: Question[] = [
  {
    id: 'q-1',
    title: 'Why is benzene exceptionally stable compared to localized hexatriene?',
    content: 'I am studying conjugated systems and notices benzene has a much lower heat of hydrogenation than expected. Can someone explain the molecular orbital theory behind its resonance stabilization energy (approx 152 kJ/mol)?',
    group_id: 'group-organic',
    author_id: 'user-3',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'q-2',
    title: 'What is the hybrid state of Carbon in carbon dioxide (CO2)?',
    content: 'CO2 is linear, but since carbon has 4 valence electrons and forms double bonds with two oxygen atoms, what is its hybridization? Is it sp or sp2? How do the pi bonds overlap?',
    group_id: 'group-organic',
    author_id: 'user-1',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'q-3',
    title: 'How does Crystal Field Splitting energy change between Octahedral and Tetrahedral complexes?',
    content: 'I know that tetrahedral complexes have a smaller splitting energy (delta_t = 4/9 delta_o). But why do the d-orbitals split in reverse (t2g is higher energy than eg in tetrahedral)?',
    group_id: 'group-inorganic',
    author_id: 'user-2',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'q-4',
    title: 'Deriving the Arrhenius equation temperature dependence',
    content: 'Can someone show a step-by-step breakdown of how the rate constant (k) changes with temperature using the activation energy (Ea) and pre-exponential factor (A)? Why does it take an exponential form?',
    group_id: 'group-physical',
    author_id: 'user-4',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// 4. MOCK ANSWERS
export const mockAnswers: Answer[] = [
  {
    id: 'a-1',
    question_id: 'q-1',
    content: 'Benzene stability is due to cyclic delocalization of its 6 pi electrons. According to Huckel\'s rule (4n+2), cyclic conjugated planar systems with 6 pi electrons occupy fully paired bonding molecular orbitals. The stabilization energy (resonance energy) occurs because all 6 pi electrons are delocalized across the six carbon p-orbitals in a unified ring, lowering the overall potential energy of the molecule dramatically compared to three isolated double bonds.',
    author_id: 'user-2',
    is_accepted: true,
    created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    upvotes_count: 24,
    has_upvoted: false,
  },
  {
    id: 'a-2',
    question_id: 'q-1',
    content: 'If you draw the molecular orbitals, you will find 3 bonding MOs (psi_1, psi_2, psi_3) and 3 antibonding MOs. All 6 electrons go into the bonding orbitals. The psi_1 orbital has 0 nodes, and psi_2/psi_3 are degenerate with 1 nodal plane. This symmetric arrangement is extremely stable!',
    author_id: 'user-4',
    is_accepted: false,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    upvotes_count: 8,
    has_upvoted: false,
  },
  {
    id: 'a-3',
    question_id: 'q-2',
    content: 'In CO2, Carbon forms 2 sigma bonds and 2 pi bonds. To form two linear sigma bonds, carbon hybridizes one s and one p orbital, resulting in **sp hybridization** (linear, 180 degrees). The remaining two unhybridized p-orbitals on carbon are perpendicular to each other and overlap with the p-orbitals of the two oxygen atoms to form the two pi bonds.',
    author_id: 'user-4',
    is_accepted: true,
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    upvotes_count: 15,
    has_upvoted: false,
  },
  {
    id: 'a-4',
    question_id: 'q-3',
    content: 'In an octahedral complex, ligands approach directly along the x, y, and z axes. The d_x2-y2 and d_z2 orbitals (eg set) point directly at the ligands, leading to high electrostatic repulsion (higher energy). In a tetrahedral complex, the ligands approach between the axes. The d_xy, d_xz, and d_yz orbitals (t2 set) point closer to the ligand direction than the eg set, so they experience greater repulsion and rise to higher energy.',
    author_id: 'user-1',
    is_accepted: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    upvotes_count: 32,
    has_upvoted: false,
  },
];

// 5. MOCK KNOWLEDGE BASE Notes & Textbooks
export const mockKnowledgeBase: KnowledgeItem[] = [
  {
    id: 'kb-1',
    title: 'OpenStax Chemistry 2e Textbook',
    description: 'Full college-level general chemistry textbook covering thermodynamics, kinetics, atomic structures, and organic basics. Free official PDF from OpenStax.',
    category: 'Textbook',
    // Official OpenStax direct PDF download link
    pdf_url: 'https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry2e-WEB_7Zesptf.pdf',
  },
  {
    id: 'kb-2',
    title: 'Organic Chemistry Basics – MIT OpenCourseWare',
    description: 'MIT lecture notes on organic compound naming, alkanes, alkenes, nucleophilic substitution (SN1/SN2), and elimination reactions (E1/E2). Free from MIT OCW.',
    category: 'Organic Chemistry',
    // MIT OCW 5.12 Organic Chemistry – lecture notes PDF
    pdf_url: 'https://ocw.mit.edu/courses/5-12-organic-chemistry-i-spring-2003/pages/lecture-notes/',
  },
  {
    id: 'kb-3',
    title: 'Inorganic Chemistry – Coordination Compounds',
    description: 'Covers ligand coordination chemistry, geometric & optical isomers, valence bond theory, crystal field theory, and magnetism of coordination complexes.',
    category: 'Inorganic Chemistry',
    // LibreTexts Inorganic Chemistry book – HTML reader (no broken API)
    pdf_url: 'https://chem.libretexts.org/Bookshelves/Inorganic_Chemistry',
  },
  {
    id: 'kb-4',
    title: 'Physical Chemistry: Thermodynamics & Kinetics',
    description: 'Entropy, Gibbs free energy, chemical equilibria, Arrhenius equation, transition state theory, and reaction mechanism rates.',
    category: 'Physical Chemistry',
    // MIT OCW 5.60 Thermodynamics & Kinetics
    pdf_url: 'https://ocw.mit.edu/courses/5-60-thermodynamics-kinetics-spring-2008/pages/lecture-notes/',
  },
  {
    id: 'kb-5',
    title: 'OpenStax Chemistry 2e – Chapter 1: Essential Ideas',
    description: 'Introductory chemistry: matter, measurement, atomic theory, periodic trends, and molecular geometry. Chapter 1 of the OpenStax 2e textbook.',
    category: 'High School & Intro',
    // Direct chapter PDF from OpenStax Chemistry 2e
    pdf_url: 'https://openstax.org/books/chemistry-2e/pages/1-introduction',
  },
];

