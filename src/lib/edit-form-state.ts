export type EditFormState = {
  revision: number;
  error: string;
  values?: Record<string, string | string[]>;
};

export const initialEditFormState: EditFormState = { revision: 0, error: "" };

export function editFormError(previous: EditFormState, formData: FormData, error: string): EditFormState {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION_") || key.toLowerCase().includes("password")) continue;
    const entries = formData.getAll(key).filter((value): value is string => typeof value === "string");
    values[key] = entries.length === 1 ? entries[0] : entries;
  }
  return { revision: previous.revision + 1, error, values };
}
