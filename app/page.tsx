import { Wordmark } from "@/components/Wordmark";
import { SearchBar } from "@/components/SearchBar";
import { EmbeddingMap } from "@/components/EmbeddingMap";
import { TrendingTopicsPanel } from "@/components/TrendingTopicsPanel";
import { MediaFilterPanel } from "@/components/MediaFilterPanel";
import { loadEvents, mediaWithCounts } from "@/lib/mockData";

export default async function HomePage() {
  const data = await loadEvents();
  const media = mediaWithCounts(data.media_sources, data.events);

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 md:py-14">
      <div className="mx-auto max-w-[1400px] flex flex-col gap-8 md:gap-10">
        <header className="flex flex-col gap-6 md:gap-8">
          <Wordmark />
          <SearchBar />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 md:gap-6">
          <EmbeddingMap events={data.events} />
          <aside className="flex flex-col gap-4 md:gap-5">
            <TrendingTopicsPanel topics={data.trending_topics} />
            <MediaFilterPanel media={media} />
          </aside>
        </div>

        <footer className="text-center text-xs text-[--color-text-muted] tracking-wide pt-4">
          ALETH·IA — datos del{" "}
          {new Date(data.generated_at).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </footer>
      </div>
    </main>
  );
}
