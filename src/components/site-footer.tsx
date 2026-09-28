import Image from "next/image";
import Link from "next/link";
import { CHAPTER_URL, DISCORD_URL, INSTAGRAM_URL, LINKTREE_URL } from "@/lib/gdg";

export function SiteFooter() {
  return (
    <footer className="team-footer">
      <div className="shell team-footer-inner">
        <div>
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} />
          <p>On Campus · The University of Texas at Dallas</p>
        </div>
        <nav aria-label="Footer links">
          <Link href="/about">About</Link>
          <Link href="/officers">Officers</Link>
          <Link href="/apply">Apply</Link>
          <a className="footer-social-link" href={DISCORD_URL} target="_blank" rel="noreferrer"><Image src="/icons/discord.svg" alt="" width={15} height={15} />Discord <span aria-hidden="true">↗</span></a>
          <a className="footer-social-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer"><Image src="/icons/instagram.svg" alt="" width={15} height={15} />Instagram <span aria-hidden="true">↗</span></a>
          <a className="footer-social-link" href={LINKTREE_URL} target="_blank" rel="noreferrer"><Image src="/icons/linktree.svg" alt="" width={15} height={15} />Linktree <span aria-hidden="true">↗</span></a>
          <a href={CHAPTER_URL} target="_blank" rel="noreferrer">Join the chapter ↗</a>
        </nav>
      </div>
      <div className="shell team-footer-legal">
        <p>Independent community-run website. Not an official website of The University of Texas at Dallas.</p>
        <p>GDG and Google Developer Groups are trademarks of Google LLC.</p>
      </div>
    </footer>
  );
}
