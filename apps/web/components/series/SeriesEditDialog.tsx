"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import type { SeriesFormValues } from "@chaptercheck/shared/validations/series";
import { useMutation } from "convex/react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { SeriesForm } from "./SeriesForm";

interface Series {
  _id: Id<"series">;
  name: string;
  description?: string;
}

interface SeriesEditDialogProps {
  series: Series;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeriesEditDialog({ series, open, onOpenChange }: SeriesEditDialogProps) {
  const updateSeries = useMutation(api.series.mutations.updateSeries);

  const handleSubmit = async (values: SeriesFormValues) => {
    await updateSeries({
      seriesId: series._id,
      name: values.name,
      description: values.description,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>
        <SeriesForm
          initialValues={{
            name: series.name,
            description: series.description,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
