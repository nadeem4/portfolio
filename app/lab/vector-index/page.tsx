import type { Metadata } from 'next';
import Link from 'next/link';
import { VectorLab } from '@/components/lab/vector/vector-lab';
import { getBlogPosts } from '@/lib/blog';
import { parseLabParams } from './params';

export const metadata: Metadata = {
  title: 'Vector index playground',
  description:
    'Build a vector index by hand: insert points, delete them, run a query, and watch every distance computation the index pays.',
};

/**
 * Referenced by catalog id, not copied.
 *
 * The titles and URLs already live in `config/blog-posts.json`, which the Notion
 * sync regenerates. Duplicating them here would let this footer rot the next
 * time a title or URL changes upstream — the same reason the category pages and
 * the sitemap derive their lists rather than keeping them by hand.
 */
const ILLUSTRATES = ['f32b19d708c8', '6fab698c33eb', 'f2e8c08fef1a'];

function illustratedPosts() {
  const posts = getBlogPosts();
  return ILLUSTRATES.flatMap((id) => posts.filter((post) => post.id === id));
}

const linkClasses =
  'font-medium leading-snug transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm';

interface LabPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VectorIndexLabPage({ searchParams }: LabPageProps) {
  // Read once, here, and handed down as props. That is the whole of the deep
  // link contract: no URL-state syncing, so the reader's back button keeps
  // meaning what they expect.
  const { k } = parseLabParams(await searchParams);

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
          <Link
            href="/blog/vector-databases"
            className="inline-block text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            ← Vector Databases
          </Link>
          <div aria-hidden="true" className="h-0.5 w-full rounded-sm bg-accent" />
          <p className="font-mono text-[0.7rem] tracking-[0.12em] text-accent">&gt; lab --index flat</p>
          <h1 className="text-2xl font-bold tracking-tight">Vector index playground</h1>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">What this teaches</h2>
          <p className="text-sm leading-relaxed text-foreground-dim">
            A flat index is the honest baseline every approximate index is measured against: it stores the vectors
            in a list and, for every query, scans every point and computes every distance. Nothing is skipped, so
            it is always exactly right and always exactly as expensive as the data is large. This playground is a
            live one — the points below are yours to add to, delete from, and query — and the number that matters
            is the distance count beside it, because that is the number every later index exists to bring down.
          </p>
          <p className="text-sm leading-relaxed text-foreground-dim">
            Deletion here is a hard removal: the point leaves the list and the index is immediately as if it never
            held it. Keep that in mind — a graph index cannot do this, and what it does instead is the subject of a
            later lab.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">What the controls do</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-foreground-dim">
            <li>
              <strong className="text-foreground">Tapping the canvas</strong> either edits the points or moves the
              query, depending on the mode. In edit mode, tapping empty space inserts a point and tapping an
              existing one removes it. In query mode, tapping runs a search from wherever you tapped.
            </li>
            <li>
              <strong className="text-foreground">Replay</strong> walks the trace of the last operation, one step at
              a time. Each position names what the index did — which point it scanned, at what distance, and whether
              that point made it into the results.
            </li>
            <li>
              <strong className="text-foreground">Cost of the last operation</strong> counts the distance
              computations and points scanned that operation paid for. It is the scoreboard, and it is deliberately
              text rather than something drawn on the canvas.
            </li>
            <li>
              <strong className="text-foreground">Index health</strong> holds the live point count and recall@{k},
              measured against brute-force search over the same points.
            </li>
            <li>
              <strong className="text-foreground">Undo</strong> drops the last operation and replays everything
              before it; <strong className="text-foreground">Reset</strong> returns to the seeded dataset.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">What to watch for</h2>
          <p className="text-sm leading-relaxed text-foreground-dim">
            Run a query, then insert ten points and run it again. The results barely move; the distance count moves
            by exactly ten. That linear relationship is the flat index in one sentence, and it is why a vector
            database with a billion vectors cannot use one.
          </p>
          <p className="text-sm leading-relaxed text-foreground-dim">
            Recall sits at 100% and will not move, because ground truth here <em>is</em> brute force over the same
            points — the flat index is graded against itself. That readout is wired now so it stays honest later:
            when an approximate index arrives, the same number starts telling you what it cost you.
          </p>
          <p className="text-sm leading-relaxed text-foreground-dim">
            2D shows the mechanism, not the geometry. Two points that look close on this canvas really are close;
            what a plane cannot show is how badly that intuition fails at 768 dimensions, where distances between
            all pairs of points converge and &ldquo;nearest&rdquo; stops meaning much. The dimensionality post below
            is the argument.
          </p>
        </section>

        {/* The lab alone opts out of the shared content column. Prose keeps the
            reading width above and below; an instrument needs room a reading
            column cannot give it. Bounded rather than full-bleed, so the page
            still reads as part of the site on a wide monitor. The negative
            box is widened, then re-centred on the viewport with a half-parent
            margin and a half-self translate — capping width after positioning
            with negative margins leaves it off-centre. */}
        <div
          data-testid="lab-region"
          className="w-[calc(100vw-3rem)] max-w-[72rem] ml-[50%] -translate-x-1/2"
        >
          <VectorLab initialK={k} />
        </div>

        <section className="space-y-3 border-t border-border pt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">The posts this illustrates</h2>
          <ul className="divide-y divide-border">
            {illustratedPosts().map((post) => (
              <li key={post.url} className="py-3">
                <a href={post.url} target="_blank" rel="noreferrer" className={linkClasses}>
                  {post.title}
                  <span aria-hidden="true" className="ml-1 text-foreground-dim">
                    ↗
                  </span>
                  <span className="sr-only"> (opens on Medium)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
