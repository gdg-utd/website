export const CHAPTER_URL =
  "https://gdg.community.dev/gdg-on-campus-the-university-of-texas-at-dallas-richardson-united-states/";

export const DISCORD_URL = "https://discord.gg/bYNaQbaTQh";
export const INSTAGRAM_URL = "https://www.instagram.com/gdg.utd/";
export const LINKTREE_URL = "https://linktr.ee/gdgutd";

export type ChapterEvent = {
  description: string;
  registrationType: string;
  startDate: string;
  title: string;
  url: string;
};

export type ChapterTeamMember = {
  name: string;
  role: string;
};

export type ChapterData = {
  events: ChapterEvent[];
  eventsUnavailable?: boolean;
  location: string;
  membersCount: number;
  team: ChapterTeamMember[];
};

type BevyEvent = {
  description_short?: string;
  event_type_title?: string;
  start_date?: string;
  title?: string;
  url?: string;
};

type BevyTeamMember = {
  title?: string;
  user?: {
    first_name?: string;
    last_name?: string;
  };
};

type BevyPageData = {
  props?: {
    pageProps?: {
      chapterData?: {
        chapter_location?: string;
        members_count?: number;
      };
      prerenderData?: {
        chapterTeam?: BevyTeamMember[];
        upcomingEvents?: {
          results?: BevyEvent[];
        };
      };
    };
  };
};

const fallbackData: ChapterData = {
  events: [],
  location: "Richardson, TX",
  membersCount: 1169,
  team: [
    { name: "Frabina Edwin", role: "President" },
    { name: "Jiya Yadav", role: "Marketing and Events Director" },
  ],
};

function parsePageData(html: string): ChapterData | null {
  const match = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );

  if (!match?.[1]) return null;

  const data = JSON.parse(match[1]) as BevyPageData;
  const pageProps = data.props?.pageProps;
  const chapter = pageProps?.chapterData;
  const events = pageProps?.prerenderData?.upcomingEvents?.results;
  const team = pageProps?.prerenderData?.chapterTeam;

  if (!chapter || !events) return null;

  const parsedEvents = events.flatMap((event) => {
    if (!event.title || !event.start_date || !event.url || !Number.isFinite(Date.parse(event.start_date))) return [];

    return [
      {
        title: event.title,
        startDate: event.start_date,
        registrationType: event.event_type_title || "Registration details",
        description: event.description_short || "Open the event page for details.",
        url: event.url,
      },
    ];
  });

  const parsedTeam = (team || []).flatMap((member) => {
    const name = [member.user?.first_name, member.user?.last_name]
      .filter(Boolean)
      .join(" ");

    if (!name || !member.title) return [];
    return [{ name, role: member.title }];
  });

  return {
    events: parsedEvents,
    location: chapter.chapter_location || fallbackData.location,
    membersCount: chapter.members_count || fallbackData.membersCount,
    team: parsedTeam.length ? parsedTeam : fallbackData.team,
  };
}

export async function getChapterData(): Promise<ChapterData> {
  const fallback = { ...fallbackData, events: [], eventsUnavailable: true };
  try {
    const response = await fetch(CHAPTER_URL, {
      headers: { "User-Agent": "GDG-UTD-Community-Site/1.0" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Chapter feed returned ${response.status}`);

    const parsed = parsePageData(await response.text());
    if (!parsed) throw new Error("Chapter feed data is unavailable");
    return { ...parsed, events: parsed.events.filter((event) => Date.parse(event.startDate) > Date.now()).sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate)) };
  } catch (error) {
    console.warn("Unable to load chapter events", error instanceof Error ? error.message : "Unknown error");
    return fallback;
  }
}
