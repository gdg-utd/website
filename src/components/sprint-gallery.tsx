import Image from "next/image";

type SprintPhoto = {
  file: string;
  shape: "portrait" | "landscape" | "wide";
  alt: string;
  shadows?: "soft" | "medium" | "strong";
  position?: string;
  zoom?: number;
};

const shadowLifts = [
  ["soft", 0.96],
  ["medium", 0.85],
  ["strong", 0.76],
] as const;

const rows: SprintPhoto[][] = [
  [
    { file: "IMG_3654", shape: "wide", position: "50% 62%", shadows: "soft", alt: "Five SPRINT participants seated together with laptops in a lecture hall" },
    { file: "P2121451", shape: "wide", shadows: "soft", alt: "Four teammates standing together for a SPRINT group photo" },
    { file: "IMG_3664", shape: "portrait", shadows: "soft", alt: "Three participants smiling together at a classroom desk" },
    { file: "P2121443", shape: "wide", shadows: "strong", zoom: 1.04, position: "55% 62%", alt: "A SPRINT team presenting its project at the front of a classroom" },
    { file: "IMG_3652", shape: "portrait", shadows: "soft", alt: "SPRINT teammates gathered along a row of lecture hall desks" },
    { file: "P2121466", shape: "wide", shadows: "soft", alt: "Four SPRINT teammates posing together after their presentation" },
    { file: "IMG_3673", shape: "portrait", shadows: "soft", zoom: 1.04, position: "50% 65%", alt: "Three SPRINT participants sitting together during a classroom session" },
    { file: "P3121489", shape: "wide", shadows: "medium", zoom: 1.04, position: "50% 65%", alt: "Participants working on laptops throughout a large SPRINT classroom" },
  ],
  [
    { file: "P2121435", shape: "wide", shadows: "medium", zoom: 1.06, position: "50% 70%", alt: "SPRINT participants gathered in a classroom for project presentations" },
    { file: "IMG_3649", shape: "wide", position: "50% 60%", shadows: "soft", alt: "A group of SPRINT participants smiling and waving from a lecture hall desk" },
    { file: "IMG_3667", shape: "portrait", shadows: "soft", alt: "Four teammates seated together during a SPRINT session" },
    { file: "P2121463", shape: "wide", shadows: "soft", alt: "Three SPRINT teammates standing together for a group portrait" },
    { file: "IMG_3675", shape: "portrait", shadows: "soft", zoom: 1.05, position: "50% 65%", alt: "SPRINT participants gathered with their team in the lecture hall" },
    { file: "P3121555", shape: "wide", shadows: "strong", zoom: 1.04, position: "50% 65%", alt: "Two students presenting their SPRINT project beside a projected slide" },
    { file: "IMG_3681", shape: "landscape", position: "50% 54%", shadows: "soft", alt: "Five participants seated behind their laptops during a SPRINT session" },
    { file: "P2121473", shape: "wide", shadows: "soft", alt: "Four SPRINT teammates posing together in a classroom" },
  ],
];

export function SprintGallery() {
  return (
    <div className="sprint-gallery-content">
      {/* Lift midtones without washing out projector screens or ceiling lights. */}
      <svg className="sprint-photo-filters" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          {shadowLifts.map(([name, exponent]) => (
            <filter id={`sprint-photo-${name}`} key={name} colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR type="gamma" amplitude="1" exponent={exponent} offset="0" />
                <feFuncG type="gamma" amplitude="1" exponent={exponent} offset="0" />
                <feFuncB type="gamma" amplitude="1" exponent={exponent} offset="0" />
              </feComponentTransfer>
            </filter>
          ))}
        </defs>
      </svg>
      <div className="sprint-photo-rows" id="sprint-photo-rows">
        {rows.map((photos, rowIndex) => (
          <div
            className="sprint-photo-viewport"
            key={rowIndex}
            role="region"
            aria-label={`SPRINT photo row ${rowIndex + 1}`}
            tabIndex={0}
          >
            <div className="sprint-photo-track">
              {[false, true].map((duplicate) => (
                <div className="sprint-photo-group" key={String(duplicate)} aria-hidden={duplicate || undefined}>
                  {photos.map((photo) => (
                    <figure className={`sprint-photo sprint-photo-${photo.shape}`} key={photo.file}>
                      <Image
                        src={`/pictures/sprint/${photo.file}.webp`}
                        alt={duplicate ? "" : photo.alt}
                        fill
                        style={{
                          filter: photo.shadows ? `url(#sprint-photo-${photo.shadows})` : undefined,
                          objectPosition: photo.position,
                          transform: photo.zoom ? `scale(${photo.zoom})` : undefined,
                          transformOrigin: photo.position,
                        }}
                        sizes={photo.shape === "portrait" ? "(max-width: 760px) 165px, 210px" : photo.shape === "landscape" ? "(max-width: 760px) 293px, 373px" : "(max-width: 760px) 391px, 498px"}
                      />
                    </figure>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
