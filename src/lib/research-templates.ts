// ─── Research Templates Data ─────────────────────────────────────────
// 12 pre-built research templates across 4 fields
// Each template provides: id, title, field, icon, description,
// suggestedKeywords (5), suggestedTitle, and color gradient

export type ResearchField = 'Technology' | 'Social Sciences' | 'Sciences' | 'Business';

export interface ResearchTemplate {
  id: string;
  title: string;
  field: ResearchField;
  icon: string;
  description: string;
  suggestedKeywords: string[];
  suggestedTitle: string;
  gradient: string;
}

export const RESEARCH_FIELDS: { label: ResearchField; icon: string }[] = [
  { label: 'Technology', icon: 'Cpu' },
  { label: 'Social Sciences', icon: 'Globe' },
  { label: 'Sciences', icon: 'Microscope' },
  { label: 'Business', icon: 'Building2' },
];

export const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  // ── Technology ──────────────────────────────────────────────────
  {
    id: 'ai-healthcare',
    title: 'Artificial Intelligence in Healthcare',
    field: 'Technology',
    icon: 'Cpu',
    description:
      'Explore the transformative role of AI and machine learning in modern healthcare systems, including diagnostics, treatment planning, and patient care optimization.',
    suggestedKeywords: [
      'Artificial Intelligence',
      'Healthcare Systems',
      'Machine Learning Diagnostics',
      'Clinical Decision Support',
      'Medical Imaging AI',
    ],
    suggestedTitle:
      'The Transformative Impact of Artificial Intelligence on Modern Healthcare Systems: A Comprehensive Literature Review',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'blockchain-supply-chain',
    title: 'Blockchain for Supply Chain',
    field: 'Technology',
    icon: 'Link',
    description:
      'Investigate how blockchain technology enhances transparency, traceability, and efficiency in global supply chain management.',
    suggestedKeywords: [
      'Blockchain Technology',
      'Supply Chain Management',
      'Decentralized Ledger',
      'Traceability',
      'Smart Contracts',
    ],
    suggestedTitle:
      'Blockchain-Based Solutions for Supply Chain Transparency and Efficiency: A Systematic Review',
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    id: 'iot-smart-cities',
    title: 'IoT Smart Cities',
    field: 'Technology',
    icon: 'Wifi',
    description:
      'Analyze the role of Internet of Things (IoT) devices and sensors in building smart city infrastructure for urban management.',
    suggestedKeywords: [
      'Internet of Things',
      'Smart City',
      'Urban Infrastructure',
      'Sensor Networks',
      'Connected Devices',
    ],
    suggestedTitle:
      'IoT-Enabled Smart City Infrastructure: Challenges, Opportunities, and Implementation Frameworks',
    gradient: 'from-cyan-500 to-emerald-600',
  },

  // ── Social Sciences ─────────────────────────────────────────────
  {
    id: 'social-media-mental-health',
    title: 'Social Media Impact on Mental Health',
    field: 'Social Sciences',
    icon: 'Heart',
    description:
      'Examine the relationship between social media usage patterns and mental health outcomes, particularly among adolescents and young adults.',
    suggestedKeywords: [
      'Social Media',
      'Mental Health',
      'Adolescent Psychology',
      'Digital Wellbeing',
      'Online Behavior',
    ],
    suggestedTitle:
      'The Impact of Social Media Usage on Mental Health Among Adolescents: A Meta-Analysis of Recent Evidence',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'remote-work-productivity',
    title: 'Remote Work Productivity',
    field: 'Social Sciences',
    icon: 'Laptop',
    description:
      'Assess the effects of remote and hybrid work arrangements on employee productivity, job satisfaction, and organizational performance.',
    suggestedKeywords: [
      'Remote Work',
      'Employee Productivity',
      'Work-Life Balance',
      'Hybrid Work Model',
      'Organizational Behavior',
    ],
    suggestedTitle:
      'Remote Work and Employee Productivity: A Literature Review of Post-Pandemic Workplace Transformations',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'digital-divide-education',
    title: 'Digital Divide in Education',
    field: 'Social Sciences',
    icon: 'GraduationCap',
    description:
      'Investigate disparities in access to digital technologies and their impact on educational equity and learning outcomes.',
    suggestedKeywords: [
      'Digital Divide',
      'Educational Equity',
      'Online Learning',
      'Technology Access',
      'Student Outcomes',
    ],
    suggestedTitle:
      'Bridging the Digital Divide in Education: A Critical Analysis of Technology Access and Learning Outcomes',
    gradient: 'from-rose-500 to-pink-600',
  },

  // ── Sciences ────────────────────────────────────────────────────
  {
    id: 'climate-change-adaptation',
    title: 'Climate Change Adaptation Strategies',
    field: 'Sciences',
    icon: 'CloudRain',
    description:
      'Review current strategies and frameworks for climate change adaptation across different sectors and geographical regions.',
    suggestedKeywords: [
      'Climate Change',
      'Adaptation Strategies',
      'Resilience Planning',
      'Environmental Policy',
      'Sustainability',
    ],
    suggestedTitle:
      'Climate Change Adaptation Strategies: A Comprehensive Review of Frameworks and Implementation Approaches',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    id: 'renewable-energy-transition',
    title: 'Renewable Energy Transition',
    field: 'Sciences',
    icon: 'Sun',
    description:
      'Analyze the global transition from fossil fuels to renewable energy sources, including technological, economic, and policy dimensions.',
    suggestedKeywords: [
      'Renewable Energy',
      'Energy Transition',
      'Solar Power',
      'Wind Energy',
      'Sustainable Development',
    ],
    suggestedTitle:
      'The Global Renewable Energy Transition: Technological Innovations, Economic Drivers, and Policy Implications',
    gradient: 'from-yellow-500 to-amber-600',
  },
  {
    id: 'crispr-gene-editing-ethics',
    title: 'CRISPR Gene Editing Ethics',
    field: 'Sciences',
    icon: 'Dna',
    description:
      'Explore the ethical, legal, and social implications of CRISPR-Cas9 gene editing technology in biomedical research and therapy.',
    suggestedKeywords: [
      'CRISPR-Cas9',
      'Gene Editing',
      'Bioethics',
      'Genomic Medicine',
      'Regulatory Frameworks',
    ],
    suggestedTitle:
      'Ethical Dimensions of CRISPR-Cas9 Gene Editing: A Narrative Review of Bioethical Discourse and Regulatory Challenges',
    gradient: 'from-blue-500 to-indigo-600',
  },

  // ── Business ────────────────────────────────────────────────────
  {
    id: 'ecommerce-consumer-behavior',
    title: 'E-commerce Consumer Behavior',
    field: 'Business',
    icon: 'ShoppingCart',
    description:
      'Study consumer purchasing behavior patterns in e-commerce platforms, including decision-making factors and personalization effects.',
    suggestedKeywords: [
      'E-commerce',
      'Consumer Behavior',
      'Online Shopping',
      'Purchase Decision',
      'Personalization',
    ],
    suggestedTitle:
      'Understanding Consumer Behavior in E-commerce: A Meta-Synthesis of Decision-Making Factors and Personalization Effects',
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    id: 'sustainable-business-models',
    title: 'Sustainable Business Models',
    field: 'Business',
    icon: 'Leaf',
    description:
      'Evaluate sustainable and circular economy business models, their implementation challenges, and environmental impact.',
    suggestedKeywords: [
      'Sustainable Business',
      'Circular Economy',
      'Corporate Social Responsibility',
      'Green Innovation',
      'Triple Bottom Line',
    ],
    suggestedTitle:
      'Sustainable Business Models and the Circular Economy: A Critical Review of Implementation and Impact',
    gradient: 'from-lime-500 to-emerald-600',
  },
  {
    id: 'fintech-emerging-markets',
    title: 'FinTech in Emerging Markets',
    field: 'Business',
    icon: 'TrendingUp',
    description:
      'Analyze the growth and impact of financial technology solutions in emerging markets, including mobile banking and digital payments.',
    suggestedKeywords: [
      'Financial Technology',
      'Emerging Markets',
      'Mobile Banking',
      'Digital Payments',
      'Financial Inclusion',
    ],
    suggestedTitle:
      'FinTech Innovation in Emerging Markets: Mobile Banking, Digital Payments, and Financial Inclusion',
    gradient: 'from-teal-500 to-emerald-600',
  },
];

/** Field-specific badge colors */
export const FIELD_COLORS: Record<ResearchField, string> = {
  Technology: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  'Social Sciences': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  Sciences: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
  Business: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};
