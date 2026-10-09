export type Advisor = {
  name: string;
  role: string;
  photo: string;
  photoPosition?: string;
};

export const advisors: Advisor[] = [
  {
    name: "Dr. Klyne Smith",
    role: "Faculty Advisor",
    photo: "/pictures/advisors/klyne-smith.jpeg",
    photoPosition: "center 34%",
  },
  {
    name: "Dr. Bhadrachalam Chitturi",
    role: "Faculty Advisor",
    photo: "/pictures/advisors/bhadrachalam-chitturi.png",
  },
];
