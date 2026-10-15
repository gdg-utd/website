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
// Roster confirmed by the GDG UTDallas team on October 14, 2026.
export const leadership: Officer[] = [
  { name: "Frabina", role: "President" },
  { name: "Jaideep", role: "Vice President" },
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
      { name: "Sharad", role: "Tech Director" },
      {
        name: "Ayesha",
        role: "Tech Officer",
        photo: "/pictures/officers/ayesha-shaikh.webp",
      },
      {
        name: "Gourav",
        role: "Tech Officer",
        photo: "/pictures/officers/gourav.webp",
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
        photo: "/pictures/officers/jiya-yadav.webp",
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
      { name: "Ann", role: "Marketing Officer" },
    ],
  },
  {
    name: "Events",
    accent: "yellow",
    members: [
      {
        name: "Jiya",
        role: "Marketing & Events Director",
        photo: "/pictures/officers/jiya-yadav.webp",
      },
      {
        name: "Sahithi",
        role: "Events Officer",
        photo: "/pictures/officers/sahithi-puttamraju.webp",
      },
      {
        name: "Nathan",
        role: "Events Officer",
        photo: "/pictures/officers/nathan-han.webp",
      },
      {
        name: "Sanchia",
        role: "Events Officer",
        photo: "/pictures/officers/sanchia-francis.webp",
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
        photo: "/pictures/officers/lakshmi-siri-appalaneni.webp",
      },
      {
        name: "Siri",
        role: "Industry Officer",
        photo: "/pictures/officers/siri.webp",
      },
      {
        name: "Divya",
        role: "Industry Officer",
        photo: "/pictures/officers/divya-yalam.webp",
      },
      {
        name: "Indra",
        role: "Industry Officer",
        photo: "/pictures/officers/indra-erdenebat.webp",
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
        photo: "/pictures/officers/akhil-n.webp",
      },
      {
        name: "Anh",
        role: "Finance Officer",
        photo: "/pictures/officers/anh.webp",
      },
      {
        name: "Sobi",
        role: "Finance Officer",
        photo: "/pictures/officers/sobi-suri.webp",
      },
      {
        name: "Rahul",
        role: "Finance Officer",
        photo: "/pictures/officers/rahul-satishkumar.webp",
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
        photo: "/pictures/officers/divya-yalam.webp",
      },
      {
        name: "Jalen",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/jalen-a.webp",
      },
      {
        name: "Khushi",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/khushi-verma.webp",
      },
      {
        name: "Lavanya",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/lavanya-bansal.webp",
      },
      {
        name: "Naavya",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/naavya.webp",
      },
      {
        name: "Polina",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/polina-maidanova.webp",
      },
      {
        name: "Pranathi",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/pranathi-gadhanki.webp",
      },
      {
        name: "Priyanka",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/priyanka.webp",
      },
      {
        name: "Siri",
        role: "GDG Sprints Officer",
        photo: "/pictures/officers/siri.webp",
      },
      { name: "Snigdha", role: "GDG Sprints Officer" },
      { name: "Urmi", role: "GDG Sprints Officer" },
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
