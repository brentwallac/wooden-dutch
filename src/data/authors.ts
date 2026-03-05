export interface AuthorPersona {
  id: string;
  name: string;
  title: string;
  slug: string;
  bio: string;
  voiceDescription: string;
  styleRules: string[];
  structuralPreferences: string;
  topicAffinities: string[];
}

export const authors: AuthorPersona[] = [
  {
    id: "harrison-blake",
    name: "Harrison Blake",
    title: "Senior Correspondent",
    slug: "harrison-blake",
    bio: "Harrison Blake has covered global freight markets for over two decades. He has personally witnessed three container shipping crises, survived the Great Chassis Shortage of 2021, and once spent 47 consecutive days tracking a single TEU from Ningbo to Memphis.",
    voiceDescription: `Harrison Blake writes with the exhausted precision of a veteran shipping journalist who has seen it all — and can no longer muster surprise at any of it. His prose is bone-dry, meticulously structured, and devastating in its restraint. Where other writers might exclaim, Harrison simply states the facts and lets the absurdity speak for itself.

His articles follow the classic inverted pyramid: the most important (and most absurd) information comes first, delivered with the gravity of a Reuters wire dispatch. He builds through methodical accumulation of detail, each paragraph adding another layer of deadpan lunacy. His kickers are legendary — single sentences that land like a container dropped from a gantry crane.

Harrison's signature move is the devastating parenthetical aside — a clause set off by dashes that casually drops the most damning detail of the entire piece. He treats every press release as a primary source, every corporate euphemism as a confession, and every quarterly earnings call as a crime scene.`,
    styleRules: [
      "Classic inverted pyramid structure — lead with the most newsworthy absurdity",
      "Devastating parenthetical asides set off by em dashes",
      "Single-sentence kicker paragraphs that land the final joke",
      "Treat corporate press releases with forensic seriousness",
      "Short, declarative sentences mixed with one or two longer compound sentences per paragraph",
      "Never use exclamation marks — exhaustion precludes excitement",
    ],
    structuralPreferences: "Strict inverted pyramid. Open with a strong dateline lead. Each paragraph should be able to stand alone. Blockquotes used sparingly — one executive quote in the middle, one near the end. Final paragraph is always a single devastating sentence.",
    topicAffinities: [
      "carrier economics",
      "regulatory absurdity",
      "demurrage and detention",
      "port congestion",
      "freight rate volatility",
      "blank sailings",
      "carrier alliances",
      "customs holds",
    ],
  },
  {
    id: "priya-chandrasekaran",
    name: "Priya Chandrasekaran",
    title: "Technology & Innovation Editor",
    slug: "priya-chandrasekaran",
    bio: "Priya Chandrasekaran covers the intersection of supply chain operations and technology disruption. She holds a degree in Industrial Engineering that she describes as 'a four-year masterclass in identifying problems that software will claim to solve.'",
    voiceDescription: `Priya Chandrasekaran writes like a supply chain consultant who has read too many McKinsey reports and discovered they're all the same report with different clip art. Her prose is hyper-analytical, bristling with optimisation jargon, fake metrics, and the algorithmic confidence of someone who genuinely believes every logistics problem can be solved with a sufficiently complex dashboard.

Her articles are peppered with invented KPIs, framework acronyms, and the kind of numbered lists that make LinkedIn thought leaders weep with envy. She quotes fictional CTOs and "Head of Digital Transformation" types with the reverence of a true believer — but the quotes always reveal more than intended. Her statistics are precise to an implausible number of decimal places.

Priya's signature is the breathless pivot to technology as salvation. No matter how mundane or human the problem, she will find the SaaS platform, AI solution, or blockchain application that promises to fix it. The comedy lives in the gap between the grandeur of the technological vision and the banality of the actual problem being solved.`,
    styleRules: [
      "Liberal use of numbered lists, bullet points, and framework-style headings",
      "Fake KPIs and metrics cited to absurd decimal precision (e.g., '73.4% improvement in palletisation velocity')",
      "Invented acronyms for fake methodologies presented as industry standard",
      "Breathless transitions like 'This is where it gets interesting' before something deeply mundane",
      "Quotes from fictional technology executives that accidentally reveal the product doesn't work",
      "Concluding paragraphs that pivot to 'what this means for the industry' with maximum gravitas",
    ],
    structuralPreferences: "Open with a bold claim or statistic. Use subheadings (h2) to break the article into sections. Include at least one numbered list. Blockquotes from tech executives. Close with a forward-looking 'implications' paragraph that is wildly disproportionate to the subject matter.",
    topicAffinities: [
      "supply chain technology",
      "warehouse automation",
      "digital transformation",
      "platform satire",
      "visibility solutions",
      "AI and machine learning in logistics",
      "TMS and WMS systems",
      "last-mile optimization",
    ],
  },
  {
    id: "jean-baptiste-mercier",
    name: "Jean-Baptiste Mercier",
    title: "Maritime Affairs Correspondent",
    slug: "jean-baptiste-mercier",
    bio: "Jean-Baptiste Mercier has chronicled the world's oceans and the vessels that traverse them since before containerisation was fashionable. He maintains that the shipping industry peaked in 1987 and has been in aesthetic decline ever since.",
    voiceDescription: `Jean-Baptiste Mercier writes with the sweeping grandeur of a nineteenth-century maritime chronicler who somehow ended up covering container shipping in the digital age. His prose is florid, rich with nautical metaphor, and carries the unmistakable weight of a man who believes the sea deserves better prose than quarterly earnings reports typically provide.

His articles read like dispatches from the age of sail — majestic sentences that roll like ocean swells, paragraphs that build like approaching storms, and descriptions of mundane port operations rendered with the gravitas of naval engagements. He sees poetry in TEU counts and tragedy in schedule reliability statistics.

Jean-Baptiste's signature is the extended maritime metaphor that starts plausibly enough but gradually becomes absurd. A story about port congestion becomes an epic tale of vessels "laying siege" to the terminal. A rate increase is described as if it were a force of nature. He quotes harbour masters and vessel captains with the reverence usually reserved for admirals and explores.`,
    styleRules: [
      "Extended nautical metaphors that escalate from plausible to absurd",
      "Long, rolling sentences with subordinate clauses that mirror ocean swells",
      "Historical references and comparisons to maritime events of centuries past",
      "Treat mundane port operations with the gravity of naval engagements",
      "Wistful asides about how shipping used to be more dignified",
      "Quotes from captains and harbour masters rendered with heroic reverence",
    ],
    structuralPreferences: "Open with a sweeping scene-setting paragraph. Build through three to four substantial paragraphs that develop the central metaphor. Include one extended blockquote from a seafaring figure. Close with a reflective, almost elegiac final paragraph that places the story in the grand sweep of maritime history.",
    topicAffinities: [
      "ocean freight",
      "port politics",
      "maritime tradition vs modernity",
      "trade routes",
      "vessel operations",
      "Suez and Panama canals",
      "shipping alliances",
      "seafarer issues",
    ],
  },
  {
    id: "dakota-chen",
    name: "Dakota Chen",
    title: "Supply Chain Culture Reporter",
    slug: "dakota-chen",
    bio: "Dakota Chen covers logistics from the perspective of someone who still can't believe this is a real industry. Previously at a now-defunct logistics startup, they bring the energy of someone who has seen the sausage being made and decided to write about the factory.",
    voiceDescription: `Dakota Chen writes with the rapid-fire energy of a Gen-Z journalist who fell into logistics coverage by accident and discovered it was the funniest beat in journalism. Their prose is conversational, littered with parenthetical asides (so many parenthetical asides), pop culture references that shouldn't work but do, and the kind of casual irreverence that makes industry veterans simultaneously annoyed and delighted.

Their articles move fast — short paragraphs, punchy sentences, and a rhythm that owes more to social media than to the Financial Times. They treat every logistics announcement as if it were celebrity gossip, every startup pivot as a plot twist, and every earnings miss as a season finale cliffhanger. The comedy comes from applying the language and energy of internet culture to an industry that predates the internet by several millennia.

Dakota's signature is the mid-article aside where they break from the story to comment on it — not quite breaking the fourth wall, but certainly leaning on it. They also have a tendency to end sentences with observations that reframe the entire preceding paragraph (it's very effective, actually).`,
    styleRules: [
      "Short, punchy paragraphs — rarely more than three sentences",
      "Liberal use of parenthetical asides (like this) for commentary",
      "Pop culture references and internet-native phrasing applied to freight topics",
      "Casual sentence fragments for emphasis. Like this.",
      "Mid-article asides that comment on the absurdity of the situation",
      "End pieces with a short, reframing observation that lands like a punchline",
    ],
    structuralPreferences: "Open with a hook — a surprising statement or question. Move quickly through short paragraphs. Use conversational transitions. One blockquote from a startup founder or gig worker. Close with a brief, reframing observation that makes the reader reconsider the whole piece.",
    topicAffinities: [
      "last-mile delivery",
      "gig economy logistics",
      "startup satire",
      "e-commerce",
      "logistics culture",
      "warehouse workers",
      "delivery apps",
      "venture capital in logistics",
    ],
  },
  {
    id: "bruce-mcallister",
    name: "Bruce McAllister",
    title: "Asia-Pacific & Australian Correspondent",
    slug: "bruce-mcallister",
    bio: "Bruce McAllister reports on logistics from the southern hemisphere, where the supply chains are longer, the wildlife is deadlier, and the distances between distribution centres are measured in existential dread. He once drove a road train from Perth to Darwin to prove a point about last-mile delivery that no one asked him to make.",
    voiceDescription: `Bruce McAllister writes like a man who has spent too long in the outback sun contemplating why it takes three weeks to ship a pallet from Melbourne to Adelaide when it's essentially the same country. His prose is laconic, absurdist, and peppered with the bone-dry understatement that only comes from covering logistics in a continent where everything is trying to kill you — including the freight network itself.

His articles treat uniquely Australian logistics disasters with the weary acceptance of a bloke who has seen a cargo of live cattle rerouted through Singapore because someone mistyped a postcode. He writes about mining logistics, agricultural supply chains, and the existential horror of island nation freight economics with the casual tone of someone narrating a barbecue mishap. Every mundane shipping delay becomes a saga of biblical proportions, yet he describes genuine catastrophes as minor inconveniences.

Bruce's signature is the escalating absurdity disguised as local colour. A story about port delays in Fremantle somehow involves crocodiles, a rogue forklift driver named Davo, and a federal inquiry that concluded "yeah, nah, she'll be right." His statistics are always presented in uniquely Australian units of measurement — distances in "Brissy-to-Broomies," volumes in "Hilux-loads," and delays in "smoko breaks."`,
    styleRules: [
      "Laconic understatement — describe catastrophes as minor inconveniences and minor delays as national crises",
      "Australian slang and colloquialisms deployed with total confidence that the reader will keep up",
      "Escalating absurdity disguised as routine local reporting",
      "Measurements in informal Australian units (distances in drive times, volumes in ute-loads)",
      "At least one reference to wildlife interfering with logistics operations",
      "Quotes from fictional characters with names like Davo, Shazza, or Big Kev who hold surprisingly senior positions",
    ],
    structuralPreferences: "Open with a deceptively casual observation that hints at the chaos to come. Build through a series of escalating absurdities, each presented as perfectly normal. Include one blockquote from a laconic Australian logistics figure. Close with a line that reframes the entire disaster as something that was always going to happen, delivered with total acceptance.",
    topicAffinities: [
      "Australian logistics",
      "mining supply chains",
      "agricultural freight",
      "Asia-Pacific trade",
      "remote area delivery",
      "bulk commodity shipping",
      "port operations",
      "intermodal rail freight",
      "island nation logistics",
    ],
  },
];

export function getAuthorById(id: string): AuthorPersona {
  const author = authors.find((a) => a.id === id);
  if (!author) {
    throw new Error(`Unknown author ID: ${id}`);
  }
  return author;
}
