/**
 * Two-letter monogram from a display name ("Yangon Test Shop" → "YT"),
 * for the avatar-style marks that stand in for a logo: the sidebar's tenant
 * and user avatars, and the printed receipt's shop mark. Shared so those
 * can't drift into showing different initials for the same name.
 */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
