export type ApplicationReviewField = {
  id: string;
  label: string;
  type: string;
  answer: string;
};

export type ApplicationReviewSection = {
  id: string;
  title: string;
  fields: ApplicationReviewField[];
};

export type ApplicationReviewEvent = {
  id: number;
  label: string;
  createdLabel: string;
};

export type ApplicationStageDecision = "accepted" | "rejected" | null;

export type ApplicationStageResult = {
  status: "updated";
  stagedDecision: ApplicationStageDecision;
  event: ApplicationReviewEvent;
} | {
  status: "unchanged";
  stagedDecision: ApplicationStageDecision;
} | {
  status: "error";
  message: string;
};

export type ApplicationReview = {
  id: number;
  applicantName: string;
  applicantEmail: string;
  openingSlug: string;
  openingTitle: string;
  submittedLabel: string;
  formVersion: number;
  publishedDecision: string;
  publishedLabel: string;
  stagedDecision?: Exclude<ApplicationStageDecision, null>;
  rsvp?: {
    status: "awaiting_response" | "confirmed" | "released" | "expired";
    deadlineLabel: string;
    respondedLabel?: string;
  };
  sections: ApplicationReviewSection[];
  events: ApplicationReviewEvent[];
};
