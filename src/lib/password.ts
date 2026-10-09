export type PasswordRequirement = {
  key: "length" | "mixedCase" | "number" | "symbol";
  label: string;
  met: boolean;
};

export type PasswordStrength = {
  isValid: boolean;
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
  requirements: PasswordRequirement[];
  score: 0 | 1 | 2 | 3 | 4;
};

export function getPasswordStrength(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    {
      key: "length",
      label: "8 or more characters",
      met: password.length >= 8,
    },
    {
      key: "mixedCase",
      label: "Uppercase and lowercase",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      key: "number",
      label: "At least one number",
      met: /\d/.test(password),
    },
    {
      key: "symbol",
      label: "At least one symbol",
      met: /[^A-Za-z0-9\s]/.test(password),
    },
  ];

  if (!password) {
    return { isValid: false, label: "", requirements, score: 0 };
  }

  const supportingRequirements = requirements.slice(1).filter(({ met }) => met).length;
  const score = requirements[0].met
    ? (Math.min(4, 1 + supportingRequirements) as 1 | 2 | 3 | 4)
    : 1;
  const labels = ["", "Weak", "Fair", "Good", "Strong"] as const;

  return {
    isValid: requirements.every(({ met }) => met),
    label: labels[score],
    requirements,
    score,
  };
}
