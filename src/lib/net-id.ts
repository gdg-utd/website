export const NET_ID_LENGTH = 9;
export const NET_ID_PATTERN = "[A-Za-z]{3}[0-9]{6}";
export const NET_ID_FORMAT_HINT = "Use three letters followed by six digits, like abc123456.";

const netIdPattern = new RegExp(`^${NET_ID_PATTERN}$`);

export function isValidNetId(value: string) {
  return value.length === NET_ID_LENGTH && netIdPattern.test(value);
}
