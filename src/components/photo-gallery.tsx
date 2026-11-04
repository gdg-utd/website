import Image from "next/image";

export type GalleryPhoto = {
  src: string;
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

export function PhotoGallery({ rows, id, label }: { rows: GalleryPhoto[][]; id: string; label: string }) {
  return (
    <div className="sprint-gallery-content">
      {/* Lift midtones without washing out projector screens or ceiling lights. */}
      <svg className="sprint-photo-filters" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          {shadowLifts.map(([name, exponent]) => (
            <filter id={`${id}-photo-${name}`} key={name} colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR type="gamma" amplitude="1" exponent={exponent} offset="0" />
                <feFuncG type="gamma" amplitude="1" exponent={exponent} offset="0" />
                <feFuncB type="gamma" amplitude="1" exponent={exponent} offset="0" />
              </feComponentTransfer>
            </filter>
          ))}
        </defs>
      </svg>
      <div className="sprint-photo-rows" id={`${id}-photo-rows`}>
        {rows.map((photos, rowIndex) => (
          <div
            className="sprint-photo-viewport"
            key={rowIndex}
            role="region"
            aria-label={`${label} photo row ${rowIndex + 1}`}
            tabIndex={0}
          >
            <div className="sprint-photo-track">
              {[false, true].map((duplicate) => (
                <div className="sprint-photo-group" key={String(duplicate)} aria-hidden={duplicate || undefined}>
                  {photos.map((photo) => (
                    <figure className={`sprint-photo sprint-photo-${photo.shape}`} key={photo.src}>
                      <Image
                        src={photo.src}
                        alt={duplicate ? "" : photo.alt}
                        fill
                        style={{
                          filter: photo.shadows ? `url(#${id}-photo-${photo.shadows})` : undefined,
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
