import { PhotoGallery, type GalleryPhoto } from "@/components/photo-gallery";

const rows: GalleryPhoto[][] = [
  [
    { src: "/pictures/chapter-outreach.png", shape: "wide", alt: "GDG UTDallas students welcoming people at an outdoor chapter table" },
    { src: "/pictures/chapter/IMG_1218.webp", shape: "portrait", position: "50% 65%", alt: "Chapter members smiling together around a classroom table" },
    { src: "/pictures/chapter/IMG_8441.webp", shape: "wide", alt: "Students working on laptops during a GDG workshop" },
    { src: "/pictures/chapter/IMG_1198.webp", shape: "portrait", alt: "A chapter member holding a decorated paper heart at a community gathering" },
    { src: "/pictures/sprint/IMG_3654.webp", shape: "wide", position: "50% 62%", shadows: "soft", alt: "SPRINT teammates gathered behind their laptops in a lecture hall" },
    { src: "/pictures/chapter/20230911205056501.webp", shape: "portrait", alt: "A student presenting beside a projected slide at a chapter event" },
    { src: "/pictures/technical-workshop.webp", shape: "wide", alt: "Students attending a GDG UTDallas technical workshop" },
  ],
  [
    { src: "/pictures/chapter/IMG_1309.webp", shape: "portrait", position: "50% 60%", alt: "Chapter members posing together for a classroom group photo" },
    { src: "/pictures/chapter/IMG_1161.webp", shape: "portrait", position: "50% 60%", alt: "Students collaborating on laptops along a classroom desk" },
    { src: "/pictures/community-meetup.png", shape: "landscape", position: "50% 38%", alt: "Three GDG UTDallas students at a community event" },
    { src: "/pictures/chapter/IMG_8435.webp", shape: "portrait", alt: "A chapter presenter explaining how to build a team project" },
    { src: "/pictures/sprint/IMG_3649.webp", shape: "wide", position: "50% 60%", shadows: "soft", alt: "SPRINT participants smiling and waving from a lecture hall desk" },
    { src: "/pictures/chapter/IMG_1166.webp", shape: "portrait", alt: "Students listening to a presentation during a chapter workshop" },
  ],
];

export function ChapterGallery() {
  return <PhotoGallery rows={rows} id="chapter" label="Around the chapter" />;
}
