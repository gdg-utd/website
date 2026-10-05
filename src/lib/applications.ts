import type { Json, Tables } from "@/lib/supabase/database.types";

export type ApplicationFieldType =
  | "short_text"
  | "long_text"
  | "url"
  | "single_choice"
  | "multiple_choice"
  | "checkbox";

export type ApplicationOption = {
  value: string;
  label: string;
};

export type ApplicationField = {
  id: string;
  type: ApplicationFieldType;
  label: string;
  required: boolean;
  help?: string;
  placeholder?: string;
  max_length?: number;
  options?: ApplicationOption[];
};

export type ApplicationSection = {
  id: string;
  title: string;
  description?: string;
  fields: ApplicationField[];
};

export type ApplicationFormSchema = {
  sections: ApplicationSection[];
};

export type OpeningDetail = {
  label: string;
  value: string;
};

export type ApplicationOpening = Tables<"application_openings"> & {
  details: OpeningDetail[];
  responsibilities: string[];
  form_schema: ApplicationFormSchema;
};

export type ApplicationResponses = Record<string, Json>;

export function parseApplicationOpening(
  opening: Tables<"application_openings">,
): ApplicationOpening {
  return {
    ...opening,
    details: Array.isArray(opening.details)
      ? opening.details.filter(isOpeningDetail)
      : [],
    responsibilities: Array.isArray(opening.responsibilities)
      ? opening.responsibilities.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    form_schema: isFormSchema(opening.form_schema)
      ? opening.form_schema
      : { sections: [] },
  };
}

export function isOpeningAccepting(opening: ApplicationOpening) {
  const now = Date.now();
  const opensAt = opening.opens_at ? Date.parse(opening.opens_at) : null;
  const closesAt = opening.closes_at ? Date.parse(opening.closes_at) : null;

  return opening.status === "open"
    && (opensAt === null || opensAt <= now)
    && (closesAt === null || closesAt > now);
}

export function buildResponses(
  schema: ApplicationFormSchema,
  formData: FormData,
): ApplicationResponses {
  const responses: ApplicationResponses = {};

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const name = `field:${field.id}`;

      if (field.type === "checkbox") {
        responses[field.id] = formData.get(name) === "true";
      } else if (field.type === "multiple_choice") {
        responses[field.id] = formData
          .getAll(name)
          .filter((value): value is string => typeof value === "string");
      } else {
        const value = formData.get(name);
        responses[field.id] = typeof value === "string" ? value.trim() : "";
      }
    }
  }

  return responses;
}

export function validateResponses(
  schema: ApplicationFormSchema,
  responses: ApplicationResponses,
) {
  const errors: string[] = [];

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const value = responses[field.id];
      const options = new Set(field.options?.map((option) => option.value));

      if (field.required) {
        const missing = field.type === "checkbox"
          ? value !== true
          : field.type === "multiple_choice"
            ? !Array.isArray(value) || value.length === 0
            : typeof value !== "string" || value.trim() === "";
        if (missing) errors.push(field.label);
      }

      if (typeof value === "string" && field.max_length && value.length > field.max_length) {
        errors.push(field.label);
      }
      if (field.type === "url" && typeof value === "string" && value) {
        try {
          const url = new URL(value);
          if (!['http:', 'https:'].includes(url.protocol)) errors.push(field.label);
        } catch {
          errors.push(field.label);
        }
      }
      if (field.type === "single_choice" && typeof value === "string" && value && !options.has(value)) {
        errors.push(field.label);
      }
      if (
        field.type === "multiple_choice"
        && Array.isArray(value)
        && value.some((item) => typeof item !== "string" || !options.has(item))
      ) {
        errors.push(field.label);
      }
    }
  }

  return [...new Set(errors)];
}

export function answerLabel(field: ApplicationField, value: Json | undefined) {
  if (field.type === "checkbox") return value === true ? "Yes" : "No";
  if (field.type === "multiple_choice" && Array.isArray(value)) {
    const labels = new Map(field.options?.map((option) => [option.value, option.label]));
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => labels.get(item) ?? item)
      .join(", ");
  }
  if (field.type === "single_choice" && typeof value === "string") {
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  return typeof value === "string" ? value : "";
}

export function applicantStatus(
  submissionState: string,
  publishedDecision: string,
) {
  if (submissionState === "draft") return "Draft";
  if (publishedDecision === "accepted") return "Accepted";
  if (publishedDecision === "rejected") return "Not selected";
  return "Submitted";
}

export function formatCentralDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function isOpeningDetail(value: Json): value is OpeningDetail {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof value.label === "string"
    && typeof value.value === "string",
  );
}

function isFormSchema(value: Json): value is ApplicationFormSchema {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!Array.isArray(value.sections)) return false;

  return value.sections.every((section) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) return false;
    return typeof section.id === "string"
      && typeof section.title === "string"
      && Array.isArray(section.fields)
      && section.fields.every((field) => {
        if (!field || typeof field !== "object" || Array.isArray(field)) return false;
        return typeof field.id === "string"
          && typeof field.label === "string"
          && typeof field.type === "string"
          && typeof field.required === "boolean";
      });
  });
}
