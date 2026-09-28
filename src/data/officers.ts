export type Officer = {
  name: string;
  role: string;
  /** Add a path from /public here when a profile photo is ready. */
  photo?: string;
};

export type OfficerGroup = {
  name: string;
  accent: "blue" | "red" | "yellow" | "green";
  members: Officer[];
};

// Update this file to add, remove, or reorder officers.
// Roster sourced from gdgutd.com/about on September 27, 2026.
export const leadership: Officer[] = [
  { name: "Frabina", role: "President" },
  { name: "Jaideep", role: "Vice President" },
];

export const officerGroups: OfficerGroup[] = [
  {
    name: "Administrative",
    accent: "blue",
    members: [{ name: "Meet", role: "Administrative Director" }],
  },
  {
    name: "Technical",
    accent: "green",
    members: [
      { name: "Sharad", role: "Tech Director" },
      { name: "Leela", role: "Tech Officer" },
      { name: "Sahithi", role: "Tech Officer" },
      { name: "Gourav", role: "Tech Officer" },
      { name: "Ayesha", role: "Tech Officer" },
      { name: "Niket", role: "Tech Officer" },
      { name: "Sourish", role: "Tech Officer" },
      { name: "Siri", role: "Tech Officer" },
      { name: "Rahul", role: "Tech Officer" },
    ],
  },
  {
    name: "Marketing",
    accent: "red",
    members: [
      { name: "Jiya", role: "Marketing & Events Director" },
      { name: "Zoya", role: "Marketing Officer" },
      { name: "Aeleph", role: "Marketing Officer" },
      { name: "Roman", role: "Marketing Officer" },
    ],
  },
  {
    name: "Events",
    accent: "yellow",
    members: [
      { name: "Jiya", role: "Marketing & Events Director" },
      { name: "Sahithi", role: "Events" },
      { name: "Rithika", role: "Events" },
      { name: "Nathan", role: "Events" },
      { name: "Sanchia", role: "Events" },
      { name: "Arjun", role: "Events" },
    ],
  },
  {
    name: "Industry",
    accent: "blue",
    members: [
      { name: "Siri A.", role: "Industry Director" },
      { name: "Indra", role: "Industry Officer" },
      { name: "Siri", role: "Industry Officer" },
      { name: "Divya", role: "Industry Officer" },
    ],
  },
  {
    name: "Finance",
    accent: "green",
    members: [
      { name: "Tanish", role: "Finance Director" },
      { name: "Sobi", role: "Finance Officer" },
      { name: "Akhil", role: "Finance Officer" },
      { name: "Rahul", role: "Finance Officer" },
    ],
  },
  {
    name: "GDG Sprints",
    accent: "red",
    members: [
      { name: "Pranav", role: "GDG Sprints Director" },
      { name: "Monish", role: "GDG Sprints Director" },
      { name: "Baba", role: "GDG Sprints Officer" },
      { name: "Urmi", role: "GDG Sprints Officer" },
      { name: "Siri", role: "GDG Sprints Officer" },
      { name: "Jalen", role: "GDG Sprints Officer" },
      { name: "Khushi", role: "GDG Sprints Officer" },
      { name: "Divya", role: "GDG Sprints Officer" },
      { name: "Ved", role: "GDG Sprints Officer" },
      { name: "Polina", role: "GDG Sprints Officer" },
      { name: "Rithika", role: "GDG Sprints Officer" },
      { name: "Pranathi", role: "GDG Sprints Officer" },
      { name: "Lavanya", role: "GDG Sprints Officer" },
      { name: "Naavya", role: "GDG Sprints Officer" },
    ],
  },
];
