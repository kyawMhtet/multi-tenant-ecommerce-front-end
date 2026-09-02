"use client";

import { controls } from "@/lib/design-tokens";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { viberLink } from "@/lib/shop-profile";
import type { SocialLinks } from "@/lib/types";

/**
 * The exact key set the backend accepts
 * ('array:facebook,instagram,tiktok,telegram,messenger,viber_phone') —
 * anything else is rejected outright. `satisfies` keeps this list and
 * SocialLinks from drifting apart: adding a platform to lib/types.ts
 * without adding it here still compiles, but a typo or a removed key here
 * won't.
 */
export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "telegram",
  "messenger",
  "viber_phone",
] as const satisfies readonly (keyof SocialLinks)[];

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// Form state is plain strings, never null: "" is both "the user emptied
// this" and what gets sent to clear the platform server-side.
export type SocialLinksFormState = Record<SocialPlatform, string>;

export type SocialLinksErrors = Partial<Record<SocialPlatform, string>>;

// viber_phone is the odd one out — a bare number, not a URL — so it carries
// its own input type and hint rather than being described like the rest.
const FIELDS: Array<{
  key: SocialPlatform;
  label: string;
  placeholder: string;
  type: "url" | "tel";
  maxLength: number;
}> = [
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/yourshop",
    type: "url",
    maxLength: 255,
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourshop",
    type: "url",
    maxLength: 255,
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@yourshop",
    type: "url",
    maxLength: 255,
  },
  {
    key: "telegram",
    label: "Telegram",
    placeholder: "https://t.me/yourshop",
    type: "url",
    maxLength: 255,
  },
  {
    key: "messenger",
    label: "Messenger",
    placeholder: "https://m.me/yourshop",
    type: "url",
    maxLength: 255,
  },
  {
    key: "viber_phone",
    label: "Viber number",
    placeholder: "09123456789",
    type: "tel",
    maxLength: 32,
  },
];

interface SocialLinksFormProps {
  form: SocialLinksFormState;
  errors: SocialLinksErrors;
  onFieldChange: (key: SocialPlatform, value: string) => void;
}

export function SocialLinksForm({ form, errors, onFieldChange }: SocialLinksFormProps) {
  const viberNumber = form.viber_phone.trim();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <Label key={field.key} className="flex flex-col items-stretch gap-1">
          <span className="text-sm">{field.label}</span>
          <Input
            type={field.type}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form[field.key]}
            onChange={(e) => onFieldChange(field.key, e.target.value)}
            className={controls.input}
          />
          {field.key === "viber_phone" ? (
            <span className="text-xs text-muted-foreground">
              {viberNumber ? (
                <>
                  Opens as <span className="font-medium">{viberLink(viberNumber)}</span>
                </>
              ) : (
                "Just the number — the chat link is built from it."
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Full link, starting with https://
            </span>
          )}
          {errors[field.key] && (
            <span className="text-sm text-destructive">{errors[field.key]}</span>
          )}
        </Label>
      ))}
    </div>
  );
}
