"use client";

import { useState } from "react";
import {
  getUtdMajors,
  isUtdDegree,
  UTD_DEGREES,
} from "@/lib/utd-academic-programs";

type UtdProgramFieldsProps = {
  degreeName: string;
  majorName: string;
  idPrefix: string;
  defaultDegree?: string | null;
  defaultMajor?: string | null;
  degreeRequired?: boolean;
  majorRequired?: boolean;
  degreeClassName?: string;
  majorClassName?: string;
};

export function UtdProgramFields({
  degreeName,
  majorName,
  idPrefix,
  defaultDegree = "",
  defaultMajor = "",
  degreeRequired = false,
  majorRequired = false,
  degreeClassName,
  majorClassName,
}: UtdProgramFieldsProps) {
  const initialDegree = defaultDegree ?? "";
  const initialMajor = defaultMajor ?? "";
  const [degree, setDegree] = useState(initialDegree);
  const [major, setMajor] = useState(initialMajor);
  const majors = getUtdMajors(degree);
  const hasLegacyDegree = degree === initialDegree
    && Boolean(initialDegree)
    && !isUtdDegree(initialDegree);
  const hasLegacyMajor = major === initialMajor
    && Boolean(initialMajor)
    && !majors.includes(initialMajor);

  function handleDegreeChange(nextDegree: string) {
    const nextMajors = getUtdMajors(nextDegree);
    setDegree(nextDegree);
    setMajor((currentMajor) => nextMajors.includes(currentMajor) ? currentMajor : "");
  }

  return (
    <>
      <label className={degreeClassName} htmlFor={`${idPrefix}-degree`}>
        <span>Degree{degreeRequired && <i aria-hidden="true"> *</i>}</span>
        <select
          id={`${idPrefix}-degree`}
          name={degreeName}
          value={degree}
          onChange={(event) => handleDegreeChange(event.target.value)}
          required={degreeRequired}
        >
          <option value="">Select a degree</option>
          {hasLegacyDegree && <option value={initialDegree}>{initialDegree}</option>}
          {UTD_DEGREES.map((option) => (
            <option value={option} key={option}>{option}</option>
          ))}
        </select>
      </label>

      <label className={majorClassName} htmlFor={`${idPrefix}-major`}>
        <span>Major{majorRequired && <i aria-hidden="true"> *</i>}</span>
        <select
          id={`${idPrefix}-major`}
          name={majorName}
          value={major}
          onChange={(event) => setMajor(event.target.value)}
          required={majorRequired}
          disabled={!degree}
        >
          <option value="">{degree ? "Select a major" : "Select a degree first"}</option>
          {hasLegacyMajor && <option value={initialMajor}>{initialMajor}</option>}
          {majors.map((option) => (
            <option value={option} key={option}>{option}</option>
          ))}
        </select>
      </label>
    </>
  );
}
