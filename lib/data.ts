// Edit this file with your real information — everything on the site pulls from here.

export const profile = {
  name: "Adrian Apsay",
  bio: [
    "Hey! I’m Adrian, currently a master’s student studying EECS at UC Berkeley. I’m particularly interested in efficient distributed systems, machine learning, and context-aware LLM evaluations assessing hallucination and context relevance. Given the rapid creation of data over the last couple of years, I’ve been fascinated with the need for optimized and scalable infrastructure to handle its sheer size.",
    "Before Berkeley, I completed my B.S. in Data Science at UC San Diego, where I served as a Teaching Assistant for 1,000+ students in programming, data structures and algorithms, and data science, primarily under Dr. Marina Langlois and Dr. Lucy Lai. I have always been a strong advocate of accessible technical information for underrepresented communities.",
    "Previously, I’ve worked for Seagate Technology and the San Diego Sheriff’s Department, contributing to AI systems and large-scale data infrastructure.",
    "Outside of academia and industry, I really enjoy music, gymming, sports, trying new food spots, and hanging out with friends!",
    "Those at UCSD, Berkeley, or anyone in general, really - feel free to contact me! Always happy to connect.",
  ],
  email: "adrianapsay [at] berkeley [dot] edu",
  links: [
    { label: "GitHub", href: "https://github.com/adrianapsay" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/adrianapsay/" },
  ],
};

export const timeline: {
  date: string;
  text: string;
  links?: { label: string; href: string }[];
}[] = [
  { date: "2026-09", text: "Beginning work with NASA Goddard! (Berkeley Capstone)" },
  { date: "2026-08", text: "Started my Master's in EECS @ UC Berkeley!" },
  { date: "2026-06", text: "Graduated from UC San Diego with a B.S. in Data Science!" },
  {
    date: "2026-03",
    text: "HDSI Capstone Showcase - Research w/ Honda Research Institute on LLM agent behavior evaluation given various contexts on hyperparameter optimization for ML!",
    links: [
      { label: "website", href: "https://adrianapsay.github.io/context-eval-website/" },
      { label: "poster", href: "https://drive.google.com/file/d/1ngxxhpaqj3E0UmWbqn7ZGpFGzqdsCg03/view?usp=sharing" },
      { label: "report", href: "https://drive.google.com/file/d/1VAFnXJ1PfBRKZegr7yxzkTpTZrTrJRH0/view?usp=sharing" },
    ],
  },
  { date: "2026-03", text: "Wrapped up TAship for DSC 20 and COGS 9 @ UC San Diego!" },
  { date: "2025-09", text: "Finished my internship at Seagate Technology as a Data Science Intern!" },
  { date: "2025-06", text: "Finished my internship at the San Diego Sheriff's Department as a Data Engineer Intern!" },
];
