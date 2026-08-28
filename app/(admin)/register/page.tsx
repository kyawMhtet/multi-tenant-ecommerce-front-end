"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useRegister } from "@/lib/hooks/useRegister";
import { setStoredTenantSlug, setStoredToken, setStoredUserName } from "@/lib/auth";
import { slugify, validateSlug } from "@/lib/slug";
import { storefrontHost } from "@/lib/tenant";
import { ErrorState } from "@/components/shared/ErrorState";
import { AuthCard } from "@/components/admin/AuthCard";
import {
  RegisterForm,
  type RegisterFormErrors,
  type RegisterFormState,
} from "@/components/admin/RegisterForm";
import { Button } from "@/components/ui/button";

const initialForm: RegisterFormState = {
  shop_name: "",
  slug: "",
  owner_name: "",
  owner_email: "",
  owner_phone: "",
  password: "",
};

const FORM_KEYS = Object.keys(initialForm) as (keyof RegisterFormState)[];

function validate(form: RegisterFormState): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!form.shop_name.trim()) errors.shop_name = "Shop name is required.";

  const slugError = validateSlug(form.slug.trim());
  if (slugError) errors.slug = slugError;

  if (!form.owner_name.trim()) errors.owner_name = "Your name is required.";

  if (!form.owner_email.trim()) {
    errors.owner_email = "Email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(form.owner_email.trim())) {
    errors.owner_email = "Enter a valid email address.";
  }

  // Assumed required to match the fields the API's example payload sends.
  // If owner_phone turns out to be optional server-side, drop this check —
  // the field itself stays, just without the client-side gate.
  if (!form.owner_phone.trim()) errors.owner_phone = "Phone is required.";

  if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}

// Laravel's 422 keys are the payload's own field names, which are also this
// form's state keys, so mapping is a lookup rather than a translation. Only
// the first message per field is shown — the fields are simple enough that
// the second is almost always a restatement.
function toFieldErrors(error: unknown): RegisterFormErrors {
  if (!(error instanceof ApiError) || !error.errors) return {};

  const fieldErrors: RegisterFormErrors = {};
  FORM_KEYS.forEach((key) => {
    const message = error.errors?.[key]?.[0];
    if (message) fieldErrors[key] = message;
  });
  return fieldErrors;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormState>(initialForm);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  // Once the owner edits the slug themselves, the shop name stops driving
  // it — otherwise typing the rest of the name would overwrite their edit.
  // Clearing the field re-arms the suggestion.
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [previewHost, setPreviewHost] = useState<string | null>(null);
  const registerShop = useRegister();

  useEffect(() => {
    // window.location.host is browser-only, so the preview domain can't be
    // known at render/SSR time — same constraint as the admin layout's
    // token read. Rendering it as null first and filling it in after mount
    // keeps the server and first client render identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewHost(window.location.host);
  }, []);

  function updateField<K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) {
    // Server-side field errors describe the values that were submitted, so
    // they're stale the moment anything changes — clear them on the first
    // keystroke rather than leaving "email already taken" sitting under a
    // corrected email. Client-side errors stay until the next submit, as on
    // the product screens.
    if (registerShop.error) registerShop.reset();

    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "slug") {
        setIsSlugEdited(value !== "");
      } else if (key === "shop_name" && !isSlugEdited) {
        next.slug = slugify(value as string);
      }

      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    registerShop.reset();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const result = await registerShop.mutateAsync({
        shop_name: form.shop_name.trim(),
        slug: form.slug.trim(),
        owner_name: form.owner_name.trim(),
        owner_email: form.owner_email.trim(),
        owner_phone: form.owner_phone.trim(),
        // Not trimmed — leading/trailing spaces are legitimate password
        // characters, and the backend compares what it was given.
        password: form.password,
      });

      // 201 carries a token, so the owner is already logged in — this is the
      // same storage step the login page does, not a second auth call.
      setStoredToken(result.token);
      setStoredUserName(result.data.name);
      if (result.data.tenant_slug) {
        setStoredTenantSlug(result.data.tenant_slug);
      }

      toast.success("Your shop is ready.");
      router.push("/dashboard");
    } catch {
      // Surfaced via the field/general errors below — mutateAsync rejecting
      // here is the expected path, not a bug to handle further.
    }
  }

  const serverErrors = toFieldErrors(registerShop.error);
  const fieldErrors = { ...serverErrors, ...errors };

  // Before mount the domain half is unknown, so the preview shows the slug
  // alone rather than a guessed domain — it fills in on the first client
  // render. A placeholder stands in for an empty field so the line never
  // reads as a bare domain with nothing in front of it.
  const previewSlug = form.slug || "your-shop";
  const slugPreview = previewHost ? storefrontHost(previewHost, previewSlug) : previewSlug;

  const generalError = (() => {
    if (!registerShop.error) return null;
    if (!(registerShop.error instanceof ApiError)) {
      return "Something went wrong. Please try again.";
    }
    if (registerShop.error.status === 429) {
      return "Too many signup attempts from this network. Please wait a minute and try again.";
    }
    // A validation error whose messages all landed on fields doesn't need a
    // banner repeating them; anything else (a 500, an unmapped 422 key) does.
    if (Object.keys(serverErrors).length > 0) return null;
    return registerShop.error.message;
  })();

  return (
    <AuthCard
      title="Create your shop"
      subtitle="Set up your store and start selling"
      footerText="Already have an account?"
      footerLinkHref="/login"
      footerLinkLabel="Sign in"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <RegisterForm
          form={form}
          errors={fieldErrors}
          onFieldChange={updateField}
          slugPreview={slugPreview}
        />

        {generalError && <ErrorState message={generalError} />}

        <Button type="submit" disabled={registerShop.isPending} className="h-11 w-full">
          {registerShop.isPending ? "Creating your shop..." : "Create shop"}
        </Button>
      </form>
    </AuthCard>
  );
}
