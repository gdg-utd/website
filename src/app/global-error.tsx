"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- A root-layout failure needs a full document navigation without relying on the app router. */

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <head><title>Page unavailable | GDG UTDallas</title><meta name="robots" content="noindex" /></head>
      <body style={{ margin: 0, background: "#f6f8fb", color: "#202124", fontFamily: "Arial, sans-serif" }}>
        <main id="main-content" style={{ maxWidth: 640, margin: "10vh auto", padding: "32px 24px", lineHeight: 1.6 }}>
          <div role="alert">
            <p>GDG UTDallas</p>
            <h1>This page couldn’t load.</h1>
            <p>Please try again. If this keeps happening, come back later.</p>
          </div>
          <button type="button" onClick={retry} style={{ padding: "12px 20px", background: "#174ea6", color: "white", border: 0, font: "inherit", cursor: "pointer" }}>Try again</button>
          <a href="/" style={{ display: "inline-block", margin: "12px 20px", color: "#174ea6" }}>Back to home</a>
        </main>
      </body>
    </html>
  );
}
