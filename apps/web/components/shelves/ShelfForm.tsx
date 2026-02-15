"use client";

import { type ShelfFormValues, shelfSchema } from "@chaptercheck/shared/validations/shelf";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ShelfFormProps {
  initialValues?: Partial<ShelfFormValues>;
  onSubmit: (values: ShelfFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function ShelfForm({ initialValues, onSubmit, onCancel, submitLabel }: ShelfFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ShelfFormValues>({
    resolver: zodResolver(shelfSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      isOrdered: initialValues?.isOrdered ?? false,
      isPublic: initialValues?.isPublic ?? true,
    },
  });

  const isOrdered = watch("isOrdered");
  const isPublic = watch("isPublic");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="My Top Sci-Fi" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="A short description of this shelf..."
          rows={3}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isOrdered">Numbered list</Label>
          <p className="text-xs text-muted-foreground">Display books as a ranked/ordered list</p>
        </div>
        <Switch
          id="isOrdered"
          checked={isOrdered}
          onCheckedChange={(checked) => setValue("isOrdered", checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isPublic">Public</Label>
          <p className="text-xs text-muted-foreground">Anyone with the link can view this shelf</p>
        </div>
        <Switch
          id="isPublic"
          checked={isPublic}
          onCheckedChange={(checked) => setValue("isPublic", checked)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
