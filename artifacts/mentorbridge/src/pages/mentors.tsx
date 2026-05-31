import { useState } from "react";
import { useSearch } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MentorCard from "@/components/MentorCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useListMentors, useListCategories, getListMentorsQueryKey } from "@workspace/api-client-react";
import { Search, SlidersHorizontal } from "lucide-react";

export default function MentorsPage() {
  const rawSearch = useSearch();
  const urlParams = new URLSearchParams(rawSearch);
  const [search, setSearch] = useState(urlParams.get("search") || "");
  const [category, setCategory] = useState(urlParams.get("category") || "all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  const listParams = {
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page: Number(page),
    limit: 12,
  };

  const { data: categories } = useListCategories();
  const { data, isLoading } = useListMentors(listParams, {
    query: { queryKey: getListMentorsQueryKey(listParams) },
  });

  const mentors = data?.mentors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="bg-primary/5 border-b border-border py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Find a Mentor</h1>
          <p className="text-muted-foreground">Browse {total > 0 ? `${total} verified` : "our"} experts across every industry</p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, role, or skill..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              data-testid="mentor-search"
            />
          </div>

          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44" data-testid="category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(categories ?? []).map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              className="w-28"
              placeholder="Min $"
              type="number"
              value={minPrice}
              onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
              data-testid="min-price"
            />
            <Input
              className="w-28"
              placeholder="Max $"
              type="number"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
              data-testid="max-price"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No mentors found</h2>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search term</p>
            <Button variant="outline" onClick={() => { setSearch(""); setCategory("all"); setMinPrice(""); setMaxPrice(""); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{total} mentor{total !== 1 ? "s" : ""} found</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {mentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground px-4">Page {page} of {totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
