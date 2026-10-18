/**
 * Capitalizes the first letter of each word in a string, preserving hyphenated words.
 * Handles undefined/null gracefully.
 * Example: "coimbatore" -> "Coimbatore", "new delhi" -> "New Delhi", "tamil-nadu" -> "Tamil-Nadu"
 */
export function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(word => {
      if (!word) return "";
      return word
        .split("-")
        .map(part => {
          if (!part) return "";
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("-");
    })
    .join(" ");
}
