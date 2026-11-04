import { PhotoGallery, type GalleryPhoto } from "@/components/photo-gallery";

const rows: GalleryPhoto[][] = [
  [
    { src: "/pictures/sprint/IMG_3654.webp", shape: "wide", position: "50% 62%", shadows: "soft", alt: "Five SPRINT participants seated together with laptops in a lecture hall" },
    { src: "/pictures/sprint/P2121451.webp", shape: "wide", shadows: "soft", alt: "Four teammates standing together for a SPRINT group photo" },
    { src: "/pictures/sprint/IMG_3664.webp", shape: "portrait", shadows: "soft", alt: "Three participants smiling together at a classroom desk" },
    { src: "/pictures/sprint/P2121443.webp", shape: "wide", shadows: "strong", zoom: 1.04, position: "55% 62%", alt: "A SPRINT team presenting its project at the front of a classroom" },
    { src: "/pictures/sprint/IMG_3652.webp", shape: "portrait", shadows: "soft", alt: "SPRINT teammates gathered along a row of lecture hall desks" },
    { src: "/pictures/sprint/P2121466.webp", shape: "wide", shadows: "soft", alt: "Four SPRINT teammates posing together after their presentation" },
    { src: "/pictures/sprint/IMG_3673.webp", shape: "portrait", shadows: "soft", zoom: 1.04, position: "50% 65%", alt: "Three SPRINT participants sitting together during a classroom session" },
    { src: "/pictures/sprint/P3121489.webp", shape: "wide", shadows: "medium", zoom: 1.04, position: "50% 65%", alt: "Participants working on laptops throughout a large SPRINT classroom" },
  ],
  [
    { src: "/pictures/sprint/P2121435.webp", shape: "wide", shadows: "medium", zoom: 1.06, position: "50% 70%", alt: "SPRINT participants gathered in a classroom for project presentations" },
    { src: "/pictures/sprint/IMG_3649.webp", shape: "wide", position: "50% 60%", shadows: "soft", alt: "A group of SPRINT participants smiling and waving from a lecture hall desk" },
    { src: "/pictures/sprint/IMG_3667.webp", shape: "portrait", shadows: "soft", alt: "Four teammates seated together during a SPRINT session" },
    { src: "/pictures/sprint/P2121463.webp", shape: "wide", shadows: "soft", alt: "Three SPRINT teammates standing together for a group portrait" },
    { src: "/pictures/sprint/IMG_3675.webp", shape: "portrait", shadows: "soft", zoom: 1.05, position: "50% 65%", alt: "SPRINT participants gathered with their team in the lecture hall" },
    { src: "/pictures/sprint/P3121555.webp", shape: "wide", shadows: "strong", zoom: 1.04, position: "50% 65%", alt: "Two students presenting their SPRINT project beside a projected slide" },
    { src: "/pictures/sprint/IMG_3681.webp", shape: "landscape", position: "50% 54%", shadows: "soft", alt: "Five participants seated behind their laptops during a SPRINT session" },
    { src: "/pictures/sprint/P2121473.webp", shape: "wide", shadows: "soft", alt: "Four SPRINT teammates posing together in a classroom" },
  ],
];

export function SprintGallery() {
  return <PhotoGallery rows={rows} id="sprint" label="SPRINT" />;
}
