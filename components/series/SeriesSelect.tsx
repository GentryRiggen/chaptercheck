"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface SeriesSelectProps {
  value?: {
    seriesId?: Id<"series">;
    seriesOrder?: number;
  };
  onChange: (value: {
    seriesId?: Id<"series">;
    seriesOrder?: number;
  }) => void;
}

export function SeriesSelect({ value, onChange }: SeriesSelectProps) {
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Series (Optional)
        </label>

        {selectedSeries ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-blue-900 font-medium">
                {selectedSeries.name}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveSeries}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
                setIsCreating(false);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search or create series..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {isCreating ? (
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={newSeriesName}
                          onChange={(e) => setNewSeriesName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateSeries();
                            }
                          }}
                          placeholder="Series name..."
                          className="px-3 py-2 border border-gray-300 rounded"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCreateSeries}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Create
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreating(false);
                              setNewSeriesName("");
                            }}
                            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleStartCreating}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-200 text-blue-600 font-medium"
                      >
                        + Create new series
                        {searchTerm && ` "${searchTerm}"`}
                      </button>

                      {displayResults && displayResults.length > 0 ? (
                        displayResults.map((series) => (
                          <button
                            key={series._id}
                            type="button"
                            onClick={() => handleSelectSeries(series._id)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50"
                          >
                            <div className="font-medium text-gray-900">
                              {series.name}
                            </div>
                            {series.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {series.description}
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm">
                          No series found
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {value?.seriesId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Book Position in Series
          </label>
          <input
            type="number"
            step="0.1"
            value={value.seriesOrder ?? ""}
            onChange={(e) => handleSeriesOrderChange(e.target.value)}
            placeholder="e.g., 1, 2.5, 3..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">
            Use decimals for novellas (e.g., 2.5 for a book between 2 and 3)
          </p>
        </div>
      )}
    </div>
  );
}
