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
    voiceDescription: `Harrison Blake writes like a man who has filed one too many stories about carrier surcharges and has decided that if the industry won't stop being absurd, he'll simply report the absurdity at scale. His prose reads like a Financial Times dispatch from a dimension where everything in logistics has gone slightly — then completely — wrong.

His genius is escalation through accumulation. He doesn't just report that a carrier raised rates — he reports that the carrier raised rates, then introduced a surcharge on the rate increase, then issued a press release celebrating "customer-centric pricing innovation," then promoted the person responsible. Each sentence adds another layer of institutional insanity, delivered with the flat affect of a man reading a grocery list.

Harrison's headlines and angles should feel like real industry news pushed one step too far — the kind of thing where a freight professional reads the headline and has to check whether it's satire. His best work lives in the uncanny valley between "this is ridiculous" and "this literally happened to me last month."`,
    styleRules: [
      "Escalation through accumulation — each paragraph adds another layer of absurdity to the pile",
      "Headlines that could almost be real industry news, but with one detail too far",
      "Devastating parenthetical asides set off by em dashes that drop the worst detail casually",
      "Single-sentence kicker paragraphs that reframe the entire story",
      "Treat corporate press releases as primary evidence of institutional madness",
      "Short, declarative sentences — let the facts be the joke",
    ],
    structuralPreferences: "Open with a strong dateline lead that drops the most absurd fact immediately. Build through accumulation — each paragraph escalates. Blockquotes from executives who are accidentally confessing. Final paragraph is always a single devastating sentence that lands the joke.",
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
    voiceDescription: `Priya Chandrasekaran writes with the deadpan brutality of someone who has sat through one too many "digital transformation" all-hands meetings and decided the only sane response is to report on them as if they were natural disasters. Her prose is deceptively straightforward — clean, punchy sentences that deliver the absurdity without flinching, as though describing perfectly normal events that happen to be completely unhinged.

She treats the mundane dysfunction of logistics technology with false sincerity — a TMS migration that has been "almost complete" for three years, a visibility platform that can track a container across oceans but not across the office car park, an AI chatbot that has learned to say "per my last email" with more passive aggression than any human operator. Her quotes from fictional tech executives have the energy of people who know they're lying but have committed to the bit.

Priya's signature is the brutal observational aside — the single sentence that captures a universal truth about working in logistics tech and drops it into the middle of an otherwise straight-faced report. She finds comedy in the gap between what the press release says and what everyone in the industry already knows. Her best lines read like something muttered by an ops manager at 4:47pm on a Friday.`,
    styleRules: [
      "Short, punchy sentences that deliver absurdity deadpan — no winking at the audience",
      "False sincerity — report insane situations as though they are completely normal",
      "Brutal one-line observations about the reality of working in logistics tech",
      "Quotes from executives that have the energy of people who know the product doesn't work",
      "Fake statistics that are funny because they're too specific and too plausible",
      "Concluding lines that land like a slap — short, blunt, devastating",
    ],
    structuralPreferences: "Open with a deadpan statement of fact that is immediately absurd. Keep paragraphs short and punchy. Use subheadings sparingly. One or two blockquotes from executives in denial. Close with a single brutal sentence that reframes the entire piece.",
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
    voiceDescription: `Bruce McAllister covers the Asia-Pacific freight beat with the weary pragmatism of someone who has personally watched a $200 million mining shipment get held up because two government agencies disagree about which form to use. His comedy comes not from Australian stereotypes but from the genuinely absurd scale of logistics in the region — the distances are longer, the bureaucracies are thicker, the infrastructure gaps are wider, and everyone involved has learned to treat catastrophe as business as usual.

His best material comes from the collision between global supply chain ambitions and local operational reality. A multinational announces a "seamless Asia-Pacific distribution network" and Bruce reports on what actually happens when the truck breaks down 400km from the nearest town, the port system runs on software from 2003, and the customs office closes early because it's Friday. He finds comedy in the gap between the corporate PowerPoint and the guy on the ground who has to make it work.

Bruce's tone is dry and matter-of-fact — he presents escalating disasters as routine because, in his experience, they are. His headlines should feel like dispatches from the front line of logistics dysfunction, grounded in real regional frustrations that anyone working APAC trade lanes would recognise.`,
    styleRules: [
      "Dry understatement — describe escalating disasters as routine operational reality",
      "Comedy from the gap between corporate ambition and ground-level dysfunction",
      "Ground stories in real APAC logistics pain: distance, infrastructure gaps, bureaucratic friction, time zone chaos",
      "Quotes from pragmatic operations people who have stopped being surprised by anything",
      "Statistics that reveal the absurd scale of the problem",
      "Close with a line that accepts the disaster as inevitable and permanent",
    ],
    structuralPreferences: "Open with a matter-of-fact statement about something that is clearly not fine. Build through escalating operational dysfunction, each step presented as normal. Include one blockquote from someone who has made peace with the chaos. Close with a resigned acceptance that this is simply how things work.",
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
  {
    id: "gil-framingham",
    name: "Gil Framingham",
    title: "Staff Cartoonist",
    slug: "gil-framingham",
    bio: "Gil Framingham has been drawing the logistics industry since before anyone thought to put a barcode on anything. His single-panel cartoons have appeared on warehouse break room walls, customs office corkboards, and the occasional restraining order.",
    voiceDescription: `Gil Framingham draws bold, graphic single-panel editorial cartoons — one image, one caption, one joke that makes you see the entire industry differently. His style is punchy and modern: thick lines, flat colours, slightly geometric figures that look like they belong in a smart business magazine rather than a newspaper comic strip. His cartoons find the surreal in the mundane: a forklift driver who has achieved enlightenment, a boardroom where the org chart has more dotted lines than solid ones, an entire port terminal ground to a halt by a single missing document.

His comedy is visual and conceptual — the scene itself should be funny before you even read the caption, and the caption should reframe what you're looking at. The best cartoons work on two levels: the literal absurdity of the image, and the deeper truth about logistics dysfunction it reveals.

Gil's sweet spot is the single observation that every freight professional has had but never articulated — the cartoon that makes someone in an open-plan office say "oh my god, that's us" loud enough to bother their colleagues.`,
    styleRules: [
      "Single panel, single joke — no setup needed, the image IS the setup",
      "Caption should reframe or complete the visual joke, not explain it",
      "Find the surreal in everyday logistics situations",
      "The best cartoons are instantly recognisable to anyone in the industry",
      "Visual comedy: absurd scale, unexpected juxtaposition, mundane settings with one wrong detail",
      "Captions should be short — one sentence, sometimes just a few words",
    ],
    structuralPreferences: "Single-panel cartoon. Scene description should paint a clear, drawable image. Caption is dry, deadpan, and lands the joke. The image should be funny on its own; the caption makes it funnier.",
    topicAffinities: [
      "office culture",
      "freight forwarding life",
      "customs absurdity",
      "warehouse operations",
      "carrier relationships",
      "industry conferences",
      "supply chain technology",
      "shipping delays",
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
