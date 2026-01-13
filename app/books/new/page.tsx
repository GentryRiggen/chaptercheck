"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { SeriesSelect } from "@/components/series/SeriesSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function NewBookPage() {
  const router = useRouter();
  const authors = useQuery(api.authors.queries.listAuthors);
  const createBook = useMutation(api.books.mutations.createBook);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [isbn, setIsbn] = useState("");
  const [publishedYear, setPublishedYear] = useState("");
  const [language, setLanguage] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState<Id<"authors">[]>([]);
  const [seriesData, setSeriesData] = useState<{
    seriesId?: Id<"series">;
    seriesOrder?: number;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthorToggle = (authorId: Id<"authors">) => {
    setSelectedAuthors((prev) =>
      prev.includes(authorId)
        ? prev.filter((id) => id !== authorId)
        : [...prev, authorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);

    try {
      await createBook({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        isbn: isbn.trim() || undefined,
        publishedYear: publishedYear ? parseInt(publishedYear) : undefined,
        language: language.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        seriesId: seriesData.seriesId,
        seriesOrder: seriesData.seriesOrder,
        authorIds: selectedAuthors.length > 0 ? selectedAuthors : undefined,
      });

      router.push("/books");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create book");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">Add New Book</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="isbn">ISBN</Label>
                    <Input
                      id="isbn"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publishedYear">Published Year</Label>
                    <Input
                      id="publishedYear"
                      type="number"
                      value={publishedYear}
                      onChange={(e) => setPublishedYear(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g., English"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverImageUrl">Cover Image URL</Label>
                  <Input
                    id="coverImageUrl"
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Authors</Label>
                  {authors === undefined ? (
                    <p className="text-sm text-muted-foreground">Loading authors...</p>
                  ) : authors.page.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No authors available.{" "}
                      <Link
                        href="/authors/new"
                        className="text-primary hover:underline"
                      >
                        Create one first
                      </Link>
                    </p>
                  ) : (
                    <Card>
                      <CardContent className="p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {authors.page.map((author) => (
                            <div
                              key={author._id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={author._id}
                                checked={selectedAuthors.includes(author._id)}
                                onCheckedChange={() => handleAuthorToggle(author._id)}
                              />
                              <label
                                htmlFor={author._id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {author.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <SeriesSelect value={seriesData} onChange={setSeriesData} />

                {error && (
                  <div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? "Creating..." : "Create Book"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="flex-1"
                  >
                    <Link href="/books">Cancel</Link>
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
