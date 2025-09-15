// Simple script to add sample questions to the database
// Run with: node scripts/seed-questions.js

const sampleQuestions = [
  {
    question: "Explain the process of photosynthesis and describe the role of chlorophyll in this process.",
    subject: "biology",
    topic: "Plant Biology",
    level: "higher",
    marks: 6,
    mark_scheme: "Award marks for: 1) Light energy absorbed by chlorophyll (1 mark), 2) Carbon dioxide + water → glucose + oxygen (1 mark), 3) Chlorophyll converts light energy to chemical energy (1 mark), 4) Occurs in chloroplasts (1 mark), 5) Glucose used for respiration/storage (1 mark), 6) Oxygen released as by-product (1 mark)",
    question_type: "essay",
    difficulty: "medium"
  },
  {
    question: "What is the difference between a compound and a mixture? Give one example of each.",
    subject: "chemistry",
    topic: "Atomic Structure",
    level: "foundation",
    marks: 4,
    mark_scheme: "Award marks for: 1) Compound = chemically bonded elements (1 mark), 2) Mixture = physically combined substances (1 mark), 3) Example of compound e.g. water/H2O (1 mark), 4) Example of mixture e.g. air/salt water (1 mark)",
    question_type: "short-answer",
    difficulty: "easy"
  },
  {
    question: "Describe how energy is transferred in a food chain and explain why energy is lost at each trophic level.",
    subject: "biology",
    topic: "Ecology",
    level: "higher",
    marks: 5,
    mark_scheme: "Award marks for: 1) Energy flows from producer to consumer (1 mark), 2) Energy lost as heat through respiration (1 mark), 3) Energy lost in movement/activity (1 mark), 4) Energy lost in undigested waste (1 mark), 5) Only ~10% energy transferred to next level (1 mark)",
    question_type: "essay",
    difficulty: "medium"
  },
  {
    question: "What is the difference between RAM and ROM in a computer system?",
    subject: "computer-science",
    topic: "Computer Hardware",
    level: "foundation",
    marks: 3,
    mark_scheme: "Award marks for: 1) RAM = Random Access Memory (1 mark), 2) ROM = Read Only Memory (1 mark), 3) RAM is volatile/temporary, ROM is permanent (1 mark)",
    question_type: "short-answer",
    difficulty: "easy"
  },
  {
    question: "Explain the greenhouse effect and discuss its impact on global climate change.",
    subject: "geography",
    topic: "Climate Change",
    level: "higher",
    marks: 6,
    mark_scheme: "Award marks for: 1) Greenhouse gases trap heat in atmosphere (1 mark), 2) Examples: CO2, methane, water vapour (1 mark), 3) Natural process but enhanced by human activity (1 mark), 4) Rising global temperatures (1 mark), 5) Melting ice caps/sea level rise (1 mark), 6) Extreme weather events (1 mark)",
    question_type: "essay",
    difficulty: "hard"
  },
  {
    question: "What is the difference between renewable and non-renewable energy sources? Give two examples of each.",
    subject: "physics",
    topic: "Energy",
    level: "foundation",
    marks: 5,
    mark_scheme: "Award marks for: 1) Renewable = can be replaced naturally (1 mark), 2) Non-renewable = finite/limited supply (1 mark), 3) Example of renewable e.g. solar/wind (1 mark), 4) Another renewable example e.g. hydro/geothermal (1 mark), 5) Example of non-renewable e.g. coal/oil/gas (1 mark)",
    question_type: "short-answer",
    difficulty: "easy"
  },
  {
    question: "Analyze the causes and consequences of the Industrial Revolution in Britain.",
    subject: "history",
    topic: "Industrial Revolution",
    level: "higher",
    marks: 8,
    mark_scheme: "Award marks for: 1) Agricultural revolution provided surplus food (1 mark), 2) Population growth created demand (1 mark), 3) Technological innovations e.g. steam engine (1 mark), 4) Access to raw materials and markets (1 mark), 5) Urbanization and factory system (1 mark), 6) Social changes - working conditions (1 mark), 7) Economic growth and wealth creation (1 mark), 8) Environmental impact (1 mark)",
    question_type: "essay",
    difficulty: "hard"
  },
  {
    question: "What is the difference between a simile and a metaphor? Provide an example of each.",
    subject: "english",
    topic: "Language Techniques",
    level: "foundation",
    marks: 4,
    mark_scheme: "Award marks for: 1) Simile uses 'like' or 'as' (1 mark), 2) Metaphor makes direct comparison (1 mark), 3) Example of simile e.g. 'as brave as a lion' (1 mark), 4) Example of metaphor e.g. 'he is a lion' (1 mark)",
    question_type: "short-answer",
    difficulty: "easy"
  }
];

console.log('Sample questions ready to be added to database:');
console.log(`Total questions: ${sampleQuestions.length}`);
console.log('Subjects covered:', [...new Set(sampleQuestions.map(q => q.subject))]);
console.log('Difficulties:', [...new Set(sampleQuestions.map(q => q.difficulty))]);

// Note: This script just displays the questions. To actually add them to the database,
// you would need to use the Supabase client or run SQL INSERT statements.
// For now, questions will be automatically added when users upload PDFs.
