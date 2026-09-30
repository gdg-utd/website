export const CHAPTER_URL =
  "https://gdg.community.dev/gdg-on-campus-the-university-of-texas-at-dallas-richardson-united-states/";

export const DISCORD_URL = "https://discord.gg/bYNaQbaTQh";
export const INSTAGRAM_URL = "https://www.instagram.com/gdscutd";
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
  events: [
    {
      title: "Launch Workshop: Connect & Code with Verizon",
      startDate: "2026-10-01T00:00:00Z",
      registrationType: "Free registration",
      description:
        "Explore current technology trends with a guest from Verizon, meet fellow students, and learn how to turn ideas into impactful projects. No prior coding experience is needed.",
      url: "https://gdg.community.dev/events/details/google-gdg-on-campus-the-university-of-texas-at-dallas-richardson-united-states-presents-launch-workshop-connect-amp-code-with-verizon/",
    },
    {
      title: "AI in Action: Computer Vision & Hand Gestures",
      startDate: "2026-10-09T00:00:00Z",
      registrationType: "Free registration",
      description:
        "A hands-on introduction to computer vision and gesture recognition, with resources provided for beginners and experienced developers alike.",
      url: "https://gdg.community.dev/events/details/google-gdg-on-campus-the-university-of-texas-at-dallas-richardson-united-states-presents-ai-in-action-computer-vision-amp-hand-gestures-2026-10-08/",
    },
    {
      title: "Workshop Wednesday",
      startDate: "2026-10-15T00:00:00Z",
      registrationType: "Free registration",
      description:
        "Work with other students on a project from scratch. The session is designed for every experience level, with the materials provided.",
      url: "https://gdg.community.dev/events/details/google-gdg-on-campus-the-university-of-texas-at-dallas-richardson-united-states-presents-workshop-wednesday-2026-10-14/",
    },
    {
      title: "Sprint Social: Connect and Unwind",
      startDate: "2026-10-16T00:00:00Z",
      registrationType: "Free registration",
      description:
        "Meet developers from different disciplines over games and snacks, exchange ideas, and get to know the community in a relaxed setting.",
      url: "https://gdg.community.dev/events/details/google-gdg-on-campus-the-university-of-texas-at-dallas-richardson-united-states-presents-sprint-social-connect-and-unwind/",
    },
  ],
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
    if (!event.title || !event.start_date || !event.url) return [];

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
  try {
    const response = await fetch(CHAPTER_URL, {
      headers: { "User-Agent": "GDG-UTD-Community-Site/1.0" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return fallbackData;

    const parsed = parsePageData(await response.text());
    return parsed || fallbackData;
  } catch {
    return fallbackData;
  }
}
