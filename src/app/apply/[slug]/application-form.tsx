"use client";
import { FormErrorSummary } from "@/components/form-error-summary";
import { useActionState } from "react";
import { UtdProgramFields } from "@/components/utd-program-fields";
import { initialEditFormState } from "@/lib/edit-form-state";
import { buildResponses, type ApplicationOpening, type ApplicationField, type ApplicationResponses } from "@/lib/applications";
import { saveApplication } from "./actions";
import { ApplicationSubmitControls } from "./submit-controls";

export function ApplicationForm({ opening, initialResponses }: { opening: ApplicationOpening; initialResponses: ApplicationResponses }) {
  const [state, formAction] = useActionState(saveApplication, initialEditFormState);
  const submitted = new FormData();
  for (const [name, value] of Object.entries(state.values ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) submitted.append(name, item);
  }
  const responses = state.values ? buildResponses(opening.form_schema, submitted) : initialResponses;
  return (
              <form className="application-form" action={formAction} key={state.revision}>
                {state.error && <FormErrorSummary message={state.error}>Your responses are still here.</FormErrorSummary>}
                <input type="hidden" name="openingVersion" value={opening.form_version} />
                <input type="hidden" name="openingSlug" value={opening.slug} />
                {opening.form_schema.sections.map((section, sectionIndex) => (
                  <section
                    className="application-form-group"
                    aria-labelledby={`application-section-${section.id}`}
                    key={section.id}
                  >
                    <header className="application-form-group-heading">
                      <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                      <h2 id={`application-section-${section.id}`}>{section.title}</h2>
                      {section.description && <p>{section.description}</p>}
                    </header>
                    <div className="application-form-fields">
                      {section.fields.map((field) => {
                        const degreeField = section.fields.find((item) => item.id === "degree");
                        const majorField = section.fields.find((item) => item.id === "major");

                        if (degreeField && majorField && field.id === "major") return null;
                        if (degreeField && majorField && field.id === "degree") {
                          return (
                            <UtdProgramFields
                              degreeName="field:degree"
                              majorName="field:major"
                              idPrefix={`application-${section.id}-program`}
                              defaultDegree={typeof responses.degree === "string" ? responses.degree : ""}
                              defaultMajor={typeof responses.major === "string" ? responses.major : ""}
                              degreeRequired={degreeField.required}
                              majorRequired={majorField.required}
                              degreeClassName="application-text-field"
                              majorClassName="application-text-field"
                              key="utd-program"
                            />
                          );
                        }

                        return <ApplicationInput field={field} value={responses[field.id]} key={field.id} />;
                      })}
                    </div>
                  </section>
                ))}

                <div className="application-form-submit-row">
                  <p>Save a draft at any time. After submitting, contact the GDG UTDallas team if something needs to be corrected.</p>
                  <ApplicationSubmitControls />
                </div>
              </form>
  );
}

function ApplicationInput({ field, value }: { field: ApplicationField; value: ApplicationResponses[string] | undefined }) {
  const id = `application-field-${field.id}`;
  const descriptionId = field.help ? `${id}-help` : undefined;
  const textValue = typeof value === "string" ? value : "";

  if (field.type === "checkbox") {
    return (
      <label className="application-checkbox" htmlFor={id}>
        <input id={id} name={`field:${field.id}`} type="checkbox" value="true" defaultChecked={value === true} required={field.required} />
        <span><ApplicationFieldLabel label={field.label} />{field.required && <i aria-hidden="true"> *</i>}</span>
      </label>
    );
  }

  if (field.type === "single_choice" || field.type === "multiple_choice") {
    const selected = new Set(Array.isArray(value) ? value : [value]);
    return (
      <fieldset data-required-multiple={field.required && field.type === "multiple_choice" ? "true" : undefined} className="application-choice-field" aria-describedby={descriptionId}>
        <legend>{field.label}{field.required && <i aria-hidden="true"> *</i>}</legend>
        {field.help && <p id={descriptionId}>{field.help}</p>}
        <div className="application-options">
          {field.options?.map((option) => (
            <label key={option.value}>
              <input
                name={`field:${field.id}`}
                type={field.type === "single_choice" ? "radio" : "checkbox"}
                value={option.value}
                defaultChecked={selected.has(option.value)}
                required={field.required && field.type === "single_choice"}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="application-text-field" htmlFor={id}>
      <span>{field.label}{field.required && <i aria-hidden="true"> *</i>}</span>
      {field.help && <small id={descriptionId}>{field.help}</small>}
      {field.type === "long_text" ? (
        <textarea
          id={id}
          name={`field:${field.id}`}
          defaultValue={textValue}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          aria-describedby={descriptionId}
          required={field.required}
          rows={7}
        />
      ) : (
        <input
          id={id}
          name={`field:${field.id}`}
          type={field.type === "url" ? "url" : "text"}
          defaultValue={textValue}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          aria-describedby={descriptionId}
          required={field.required}
        />
      )}
    </label>
  );
}

function ApplicationFieldLabel({ label }: { label: string }) {
  const agreementPrefix = "Agreement:";
  if (!label.startsWith(agreementPrefix)) return label;

  return (
    <>
      <strong>{agreementPrefix}</strong>
      {label.slice(agreementPrefix.length)}
    </>
  );
}
