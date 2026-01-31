"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SeriesSelectProps {
  value?: {
    seriesId?: Id<"series">;
    seriesOrder?: number;
  };
  onChange: (value: {
    seriesId?: Id<"series">;
    seriesOrder?: number;
  }) => void;
  error?: string;
}

export function SeriesSelect({ value, onChange, error }: SeriesSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");

  const searchResults = useQuery(api.series.queries.searchSeries, {
    searchTerm: searchTerm,
  });
  const allSeries = useQuery(api.series.queries.listSeries);
  const createSeries = useMutation(api.series.mutations.createSeries);

  const selectedSeries =
    value?.seriesId && allSeries
      ? allSeries.find((s) => s._id === value.seriesId)
      : null;

  const handleSelectSeries = (seriesId: Id<"series">) => {
    onChange({
      seriesId,
      seriesOrder: value?.seriesOrder,
    });
    setShowDropdown(false);
    setSearchTerm("");
  };

  const handleStartCreating = () => {
    setIsCreating(true);
    setNewSeriesName(searchTerm);
  };

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) return;

    try {
      const seriesId = await createSeries({ name: newSeriesName.trim() });
      onChange({
        seriesId,
        seriesOrder: value?.seriesOrder,
      });
      setIsCreating(false);
      setNewSeriesName("");
      setSearchTerm("");
      setShowDropdown(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create series");
    }
  };

  const handleRemoveSeries = () => {
    onChange({
      seriesId: undefined,
      seriesOrder: undefined,
    });
  };

  const handleSeriesOrderChange = (order: string) => {
    const orderNum = order === "" ? undefined : parseFloat(order);
    onChange({
      seriesId: value?.seriesId,
      seriesOrder: orderNum,
    });
  };

  const displayResults = searchTerm
    ? searchResults
    : allSeries?.slice(0, 10) || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Series (Optional)</Label>

        {selectedSeries ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Badge variant="secondary" className="text-sm py-2 px-3">
                {selectedSeries.name}
              </Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveSeries}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
                setIsCreating(false);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search or create series..."
            />

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-hidden">
                  {isCreating ? (
                    <div className="p-3 space-y-3">
                      <Input
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateSeries();
                          }
                        }}
                        placeholder="Series name..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleCreateSeries}
                          size="sm"
                          className="flex-1"
                        >
                          Create
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsCreating(false);
                            setNewSeriesName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem onSelect={handleStartCreating}>
                            <span className="text-primary font-medium">
                              + Create new series
                              {searchTerm && ` "${searchTerm}"`}
                            </span>
                          </CommandItem>
                        </CommandGroup>

                        {displayResults && displayResults.length > 0 && (
                          <CommandGroup>
                            {displayResults.map((series) => (
                              <CommandItem
                                key={series._id}
                                onSelect={() => handleSelectSeries(series._id)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {series.name}
                                  </div>
                                  {series.description && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {series.description}
                                    </div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}

                        {(!displayResults || displayResults.length === 0) && (
                          <CommandEmpty>No series found</CommandEmpty>
                        )}
                      </CommandList>
                    </Command>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {value?.seriesId && (
        <div className="space-y-2">
          <Label htmlFor="seriesOrder">Book Position in Series *</Label>
          <Input
            id="seriesOrder"
            type="number"
            step="0.1"
            value={value.seriesOrder ?? ""}
            onChange={(e) => handleSeriesOrderChange(e.target.value)}
            placeholder="e.g., 1, 2.5, 3..."
            className={error ? "border-destructive" : ""}
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Use decimals for novellas (e.g., 2.5 for a book between 2 and 3)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
