/* PageCraft AI - Data Models & Presets */

const TEMPLATES = [
  {
    id: "exec-grid",
    name: "Modern SaaS",
    category: "SaaS / Tech",
    badge: "Glassmorphic Grid",
    description: "Modern 2-column glassmorphic grid layout with cyan glowing metrics.",
    primaryColor: "#6366f1",
    isDark: true
  },
  {
    id: "minimal-exec",
    name: "Minimalist",
    category: "Executive / Arch",
    badge: "Stark Monochrome",
    description: "Ultra clean stark monochrome layout with square corners and architectural rules.",
    primaryColor: "#0f172a",
    isDark: false
  },
  {
    id: "neo-brutalist",
    name: "Brutalist",
    category: "High Contrast",
    badge: "3px Black Border Offset",
    description: "Vibrant high-contrast heavy drop shadow brutalist style.",
    primaryColor: "#f59e0b",
    isDark: true
  },
  {
    id: "cybertech",
    name: "Cybertech",
    category: "Web3 / AI",
    badge: "Neon Cyberpunk",
    description: "Futuristic neon glowing borders with chamfered cut cards.",
    primaryColor: "#06b6d4",
    isDark: true
  },
  {
    id: "dense-vc",
    name: "Dense VC",
    category: "VC Standard",
    badge: "3-Col Compact",
    description: "Compact 3-column split metric layout for maximum data density.",
    primaryColor: "#10b981",
    isDark: true
  },
  {
    id: "mint-impact",
    name: "Mint Impact",
    category: "Climate / Agri",
    badge: "Teal & Mint Light",
    description: "Clean light layout with a solid teal header, mint accent cards, and centered founder photos — built for climate and impact-driven startups.",
    primaryColor: "#0d4f5c",
    isDark: false
  }
];

const DEFAULT_STARTUP = {
  // Basic Info
  name: "HyperScale AI",
  logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
  tagline: "Transforming Raw Startup Data into Investor-Ready One-Pagers",
  
  // Sector & Grid Info
  climateSector: "Climate Tech & Clean Energy",
  subSector: "AI Grid & GPU Optimization",
  stage: "Series A",
  marketSize: "$120B Total Addressable Market (TAM)",

  // Impact Metrics (Right Side Stack)
  totalFundRaised: "$5.2M Total Raised",
  revenueLast12Months: "$1.4M ARR (180% QoQ)",
  countries: "14 Countries Active",
  co2EmissionReduced: "1,200 Tons CO2e / Year",
  avgEnergySavings: "42% Average Energy Saved",
  waterSaved: "850,000 Liters Water Saved",

  // Business & Solution
  uspAIUse: "Proprietary neural pruning algorithm reducing data center GPU power consumption by 42% in real-time.",
  targetCustomer: "Fortune 500 Enterprise Data Centers & Hyperscale Cloud Providers",
  businessModel: "B2B SaaS License + $0.02 Usage Fee per GPU Hour",
  teamSize: "14 Full-time Engineers & Scientists",

  // Funding Ask
  currentAsk: "$5.0M Series A Lead Investment sought for European Expansion",

  // Footer Info
  incorporateYear: "2024",
  headquaters: "San Francisco, CA",
  website: "www.hyperscale.ai",

  // Brand Styling & Logos
  partnerLogoBg: "#ffffff",
  investorLogoBg: "#ffffff",

  // Strategic Partners & Backed By Investors (Logos Showcase)
  strategicPartners: [
    { name: "Microsoft Cloud", logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80" },
    { name: "NVIDIA Inception", logo: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&auto=format&fit=crop&q=80" },
    { name: "AWS Activate", logo: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80" }
  ],
  backedBy: [
    { name: "Y Combinator", logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80" },
    { name: "Founders Fund", logo: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80" },
    { name: "Sequoia Capital", logo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100&auto=format&fit=crop&q=80" }
  ],

  currentTraction: "$1.4M ARR | 180% QoQ Growth | 42 Active Enterprise Clients",
  milestones: [
    "Launched V2.0 Engine with multi-modal vision-language agents",
    "Closed 3 Fortune 100 enterprise contracts ($250k ACV each)",
    "Achieved SOC2 Type II Certification"
  ],
  achievements: "Winner of AI Innovation Award 2025; Featured in Wall Street Journal Tech Digest.",
  roadmap: [
    "Q3 2026: On-premise air-gapped deployment option for defense & banking",
    "Q4 2026: Autonomous agent marketplace with 500+ pre-built actions",
    "Q1 2027: Multi-agent consensus engine for automated audit trails"
  ],

  useOfFunds: "50% Engineering & R&D | 30% Enterprise Sales Expansion | 20% Marketing & Ops",
  previousFunding: "$1.8M Pre-Seed led by Founders Fund & Angel Syndicate",

  // Climate Impact / ESG
  climateMetrics: {
    carbonReduction: "1,200 Tons CO2e saved via optimized GPU compute routing",
    sdgsSupported: ["SDG 9: Industry, Innovation & Infrastructure", "SDG 12: Responsible Consumption", "SDG 13: Climate Action"],
    environmentalBenefits: "HyperScale's neural pruning algorithm reduces GPU power consumption by 42% per inference step.",
    esgMetrics: "100% renewable energy data centers; 45% gender diversity in executive tech roles.",
    impactSummary: "Empowering sustainable computing by minimizing unnecessary server cycles across global data centers."
  },

  // Team Information
  teamSize: "14 Full-time Engineers & Researchers",
  foundingTeam: [
    {
      name: "Dr. Elena Vance",
      title: "Co-Founder & CEO",
      experience: "Ex-Google Brain Principal Scientist, PhD in AI from Stanford University.",
      linkedIn: "https://linkedin.com/in/elena-vance-ai",
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
    },
    {
      name: "Marcus Sterling",
      title: "Co-Founder & CTO",
      experience: "Ex-Stripe Infrastructure Tech Lead, 12 years building distributed systems.",
      linkedIn: "https://linkedin.com/in/marcus-sterling-dev",
      photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80"
    }
  ],
  advisors: ["Prof. Andrew Ng (AI Advisor)", "Sarah T. (Former VP Product at Slack)"],

  // Custom Links
  demoUrl: "https://demo.hyperscale.ai",
  pitchVideo: "https://youtube.com/watch?v=sample",
  pitchDeckFile: "HyperScale_AI_SeriesA_PitchDeck.pdf"
};

const SAMPLE_BULK_STARTUPS = [
  {
    id: "sp-001",
    name: "EcoGrid Solutions",
    sector: "Climate Tech",
    stage: "Seed",
    location: "Austin, TX",
    currentTraction: "$420k ARR (220% YoY)",
    currentAsk: "$2.5M Seed",
    climateMetrics: "15,000 Tons CO2 Offset",
    status: "Ready",
    reviewerEmail: "partner@climatefund.vc",
    logo: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=150&auto=format&fit=crop&q=80",
    description: "AI-driven microgrid optimization software reducing grid energy loss by 30%."
  },
  {
    id: "sp-002",
    name: "HealthPulse AI",
    sector: "Healthcare",
    stage: "Pre-Seed",
    location: "Boston, MA",
    currentTraction: "3 Clinical Studies Completed",
    currentAsk: "$1.8M Pre-Seed",
    climateMetrics: "ESG Compliant Digital Health",
    status: "Ready",
    reviewerEmail: "invest@biotechventures.com",
    logo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=150&auto=format&fit=crop&q=80",
    description: "Non-invasive biomarker tracking using smartphone optical sensors."
  },
  {
    id: "sp-003",
    name: "PayStride",
    sector: "FinTech",
    stage: "Series A",
    location: "New York, NY",
    currentTraction: "$3.2M ARR (85 enterprise clients)",
    currentAsk: "$8M Series A",
    climateMetrics: "Zero Paper Digital Invoicing",
    status: "In Review",
    reviewerEmail: "alex@nycapital.io",
    logo: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=150&auto=format&fit=crop&q=80",
    description: "Cross-border B2B instant settlement network powered by smart liquidity pools."
  },
  {
    id: "sp-004",
    name: "AgriDrone X",
    sector: "AgriTech",
    stage: "Seed",
    location: "Sacramento, CA",
    currentTraction: "120,000 Acres Surveyed",
    currentAsk: "$3.0M Seed",
    climateMetrics: "40% Chemical Pesticide Reduction",
    status: "Ready",
    reviewerEmail: "green@agriventures.com",
    logo: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=150&auto=format&fit=crop&q=80",
    description: "Autonomous precision spraying drones for sustainable crop yield management."
  },
  {
    id: "sp-005",
    name: "QuantumByte",
    sector: "Deep Tech",
    stage: "Series A",
    location: "Seattle, WA",
    currentTraction: "4 Patents Granted, 2 Fortune 50 PILOTS",
    currentAsk: "$6.5M Series A",
    climateMetrics: "Low Energy Quantum Emulation",
    status: "Draft",
    reviewerEmail: "dealflow@deeptechvc.org",
    logo: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=150&auto=format&fit=crop&q=80",
    description: "Quantum-resistant encryption algorithms for cloud infrastructure security."
  },
  {
    id: "sp-006",
    name: "EduSpark",
    sector: "EdTech",
    stage: "Seed",
    location: "Chicago, IL",
    currentTraction: "85,000 Monthly Active Learners",
    currentAsk: "$1.5M Seed",
    climateMetrics: "SDG 4 Quality Education",
    status: "Ready",
    reviewerEmail: "syndicate@edtechinvestors.com",
    logo: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&auto=format&fit=crop&q=80",
    description: "Adaptive AI tutoring companion for STEM high school curriculum."
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    timestamp: "10 mins ago",
    title: "Email Opened by Reviewer",
    message: "Partner at Climate Capital opened the one-pager report for EcoGrid Solutions.",
    type: "opened",
    read: false,
    startupName: "EcoGrid Solutions"
  },
  {
    id: "notif-2",
    timestamp: "1 hour ago",
    title: "New Review Reply Received",
    message: "Alex Vance replied: 'Loved the traction metrics! When can we schedule a 15-min call?'",
    type: "replied",
    read: false,
    startupName: "HyperScale AI"
  },
  {
    id: "notif-3",
    timestamp: "3 hours ago",
    title: "Attachment Downloaded",
    message: "Biotech Ventures downloaded the PDF report for HealthPulse AI.",
    type: "downloaded",
    read: true,
    startupName: "HealthPulse AI"
  },
  {
    id: "notif-4",
    timestamp: "Yesterday",
    title: "Bulk Creation Batch Completed",
    message: "Successfully generated 6 startup one-pagers from CSV batch import.",
    type: "system",
    read: true,
    startupName: "Batch Import #104"
  }
];

const INITIAL_REPLY_THREADS = {
  "HyperScale AI": [
    {
      sender: "You (PageCraft AI)",
      email: "incubator@pagecraft.ai",
      timestamp: "Today at 9:15 AM",
      body: "Hi Alex,\n\nPlease review the updated Series A One-Pager report for HyperScale AI. They hit $1.4M ARR with 180% QoQ growth.\n\nBest regards,\nPageCraft AI Team",
      attachment: "HyperScale_AI_OnePager.pdf"
    },
    {
      sender: "Alex Vance (Partner, Horizon VC)",
      email: "alex@horizonvc.com",
      timestamp: "Today at 11:30 AM",
      body: "Hi Team,\n\nThanks for sending this over! The traction numbers look very compelling, especially the $250k ACV enterprise wins. Could you clarify if the on-premise deployment option in Q3 is already in beta trial with any financial customer?",
      attachment: null
    }
  ]
};
