import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductImagePicker } from "@/components/admin/ProductImagePicker";
import { useCategories } from "@/lib/hooks/useCategories";
import type { ProductImage } from "@/lib/types";

export interface ProductFormState {
  name: string;
  description: string;
  categoryId: number | null;
  // Product-level storefront visibility. Only surfaced on the edit screen
  // (showActiveToggle) — a brand-new product is always created active, so
  // the create screen leaves this at its default and never sends it.
  isActive: boolean;
}

export interface ProductFormErrors {
  name?: string;
}

export interface ProductFormProps {
  form: ProductFormState;
  errors: ProductFormErrors;
  onFieldChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;
  // Only passed by the edit screen — empty/undefined on create, since a
  // brand-new product has no uploaded images yet.
  existingImages?: ProductImage[];
  // Local-only "marked for removal" state — see ProductImagePicker. Only
  // relevant when existingImages is non-empty.
  imagesToDelete?: number[];
  onImagesToDeleteChange?: (ids: number[]) => void;
  pendingImages: File[];
  onPendingImagesChange: (files: File[]) => void;
  // Edit screen only — the "Active" toggle is meaningless before the product
  // exists.
  showActiveToggle?: boolean;
}

export function ProductForm({
  form,
  errors,
  onFieldChange,
  existingImages,
  imagesToDelete,
  onImagesToDeleteChange,
  pendingImages,
  onPendingImagesChange,
  showActiveToggle = false,
}: ProductFormProps) {
  const { data: categories } = useCategories();

  // See ProductFilterBar's identical comment: Base UI's <Select.Value>
  // resolves its label from an already-mounted matching <Select.Item>, but
  // categories load asynchronously — on the edit screen, form.categoryId is
  // seeded from the product as soon as it loads, which can easily happen
  // before useCategories resolves, so the id's item was never mounted yet.
  // items is Base UI's documented fix: an explicit id → label map.
  const categoryItems: Record<string, string> = { none: "None" };
  categories?.forEach((category) => {
    categoryItems[String(category.id)] = category.name;
  });

  return (
    <>
      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-sm">Name</span>
        <Input
          type="text"
          value={form.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
        />
        {errors.name && <span className="text-sm text-destructive">{errors.name}</span>}
      </Label>

      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-sm">Description</span>
        <Textarea
          value={form.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          rows={3}
        />
      </Label>

      <ProductImagePicker
        existingImages={existingImages}
        imagesToDelete={imagesToDelete}
        onImagesToDeleteChange={onImagesToDeleteChange}
        pendingFiles={pendingImages}
        onPendingFilesChange={onPendingImagesChange}
      />

      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-sm">Category</span>
        <Select
          items={categoryItems}
          value={form.categoryId !== null ? String(form.categoryId) : "none"}
          onValueChange={(value) =>
            onFieldChange("categoryId", !value || value === "none" ? null : Number(value))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>

      {showActiveToggle && (
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) => onFieldChange("isActive", checked === true)}
            />
            Active
          </Label>
          <span className="text-sm text-muted-foreground">
            When off, this whole product is hidden from your storefront. Its variants keep their own
            settings.
          </span>
        </div>
      )}
    </>
  );
}
