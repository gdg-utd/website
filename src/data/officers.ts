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
// Roster updated by the GDG UTDallas team on November 4, 2026.
export const leadership: Officer[] = [
  { name: "Frabina", role: "President", photo: "/pictures/officers/frabina-2026-11.webp" },
  { name: "Jaideep", role: "Vice President", photo: "/pictures/officers/jaideep-2026-11.webp" },
];

export const officerGroups: OfficerGroup[] = [
  {
    name: "Administrative",
    accent: "blue",
    members: [
      {
        name: "Meet",
        role: "Administrative Director",
        photo: "/pictures/officers/meet-shah.webp",
      },
    ],
  },
  {
    name: "Technical",
    accent: "green",
    members: [
      { name: "Sharad", role: "Tech Director", photo: "/pictures/officers/sharad-2026-11.webp" },
      {
        name: "Ayesha",
        role: "Tech Officer",
        photo: "/pictures/officers/ayesha-shaikh.webp",
      },
      {
        name: "Niket",
        role: "Tech Officer",
        photo: "/pictures/officers/niket-sheth.webp",
      },
      {
        name: "Sai",
        role: "Tech Officer",
        photo: "/pictures/officers/sai-thiruveedula.webp",
      },
    ],
  },
  {
    name: "Marketing",
    accent: "red",
    members: [
      {
        name: "Jiya",
        role: "Marketing & Events Director",
        photo: "/pictures/officers/jiya-yadav-2026-11-v2.webp",
      },
      {
        name: "Zoya",
        role: "Marketing Officer",
        photo: "/pictures/officers/zoya-syed.webp",
      },
      {
        name: "Roman",
        role: "Marketing Officer",
        photo: "/pictures/officers/roman.webp",
      },
      { name: "Ann", role: "Marketing Officer", photo: "/pictures/officers/ann-2026-11.webp" },
    ],
  },
  {
    name: "Events",
    accent: "yellow",
    members: [
      {
        name: "Jiya",
        role: "Marketing & Events Director",
        photo: "/pictures/officers/jiya-yadav-2026-11-v2.webp",
      },
      {
        name: "Sahithi",
        role: "Events Officer",
        photo: "/pictures/officers/sahithi-puttamraju.webp",
      },
      {
        name: "Nathan",
        role: "Events Officer",
        photo: "/pictures/officers/nathan-han-2026-11.webp",
      },
      {
        name: "Sanchia",
        role: "Events Officer",
        photo: "/pictures/officers/sanchia-francis-2026-11.webp",
      },
      {
        name: "Arjun",
        role: "Events Officer",
        photo: "/pictures/officers/arjun-ramesh.webp",
      },
      {
        name: "Sanjey",
        role: "Events Officer",
        photo: "/pictures/officers/sanjey-manian.webp",
      },
    ],
  },
  {
    name: "Industry",
    accent: "blue",
    members: [
      {
        name: "Siri A.",
        role: "Industry Director",
        photo: "/pictures/officers/lakshmi-siri-appalaneni-2026-11.webp",
      },
      {
        name: "Siri",
        role: "Industry Officer",
        photo: "/pictures/officers/siri-2026-11.webp",
      },
      {
        name: "Divya",
        role: "Industry Officer",
        photo: "/pictures/officers/divya-yalam-2026-11.webp",
      },
      {
        name: "Indra",
        role: "Industry Officer",
        photo: "/pictures/officers/indra-erdenebat-2026-11.webp",
      },
    ],
  },
  {
    name: "Finance",
    accent: "green",
    members: [
      {
        name: "Akhil",
        role: "Finance Director",
        photo: "/pictures/officers/akhil-n-2026-11.webp",
      },
      {
        name: "Anh",
        role: "Finance Officer",
        photo: "/pictures/officers/anh.webp",
      },
      {
        name: "Sobi",
        role: "Finance Officer",
        photo: "/pictures/officers/sobi-suri-2026-11.webp",
      },
      {
        name: "Rahul",
        role: "Finance Officer",
        photo: "/pictures/officers/rahul-satishkumar-2026-11.webp",
      },
    ],
  },
  {
    name: "GDG Sprints",
    accent: "red",
    members: [
      {
        name: "Pranav",
        role: "GDG Sprints Director",
        photo: "/pictures/officers/pranav-palutla.webp",
      },
      {
        name: "Monish",
        role: "GDG Sprints Director",
        photo: "/pictures/officers/monish-mehta.webp",
      },
      {
        name: "Baba",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/baba-sumukhesh.webp",
      },
      {
        name: "Divya",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/divya-yalam-2026-11.webp",
      },
      {
        name: "Jalen",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/jalen-a-2026-11.webp",
      },
      {
        name: "Khushi",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/khushi-verma.webp",
      },
      {
        name: "Lavanya",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/lavanya-bansal-2026-11.webp",
      },
      {
        name: "Naavya",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/naavya-2026-11.webp",
      },
      {
        name: "Polina",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/polina-maidanova-2026-11.webp",
      },
      {
        name: "Pranathi",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/pranathi-gadhanki-2026-11.webp",
      },
      {
        name: "Priyanka",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/priyanka.webp",
      },
      {
        name: "Siri",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/siri-2026-11.webp",
      },
      { name: "Snigdha", role: "GDG Sprints Officer", photo: "/pictures/officers/snigdha-2026-11.webp" },
      { name: "Urmi", role: "GDG Sprints Officer", photo: "/pictures/officers/urmi-2026-11.webp" },
      {
        name: "Ved",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/ved-patel.webp",
      },
      {
        name: "Rithika",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/rithika-gantla.webp",
      },
    ],
  },
];
