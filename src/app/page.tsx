/* --------------------------------------------------------------------------
   Home page – sign-in + caption generator + Unsplash image preview
   --------------------------------------------------------------------------
   This file is a “Client Component” because we use React hooks (`useState`)
   and NextAuth’s `useSession` hook, which both require client-side JS.
--------------------------------------------------------------------------- */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, FormEvent } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

/* ------------------------------------------------------------------ */
/*  1. TypeScript interface that mirrors the API response shape      */
/* ------------------------------------------------------------------ */
interface GeneratedItem {
  caption: string;
  imageUrl: string | null;
  alt: string;
}

/* ------------------------------------------------------------------ */
/*  2. AuthButton component – sign in / sign out                      */
/* ------------------------------------------------------------------ */
function AuthButton() {
  const { data: session, status } = useSession();

  /* While NextAuth checks cookies we get `status === "loading"`;    */
  /* returning null prevents flicker.                                */
  if (status === "loading") return null;

  return session ? (
    /* Logged-in state ------------------------------------------------*/
    <div className="flex items-center gap-4">
      <span className="text-sm">Signed in as {session.user?.email}</span>
      <button
        onClick={() => signOut()}
        className="rounded bg-red-600 text-white px-3 py-1 text-sm hover:bg-red-500"
      >
        Sign out
      </button>
    </div>
  ) : (
    /* Logged-out state ----------------------------------------------*/
    <button
      onClick={() => signIn("google")}
      className="rounded bg-blue-600 text-white px-3 py-1 text-sm hover:bg-blue-500"
    >
      Sign in with Google
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  3. PostGenerator – input form + shows generated results           */
/* ------------------------------------------------------------------ */
function PostGenerator() {
  /* ------ React state hooks -------------------------------------- */
  const [industry, setIndustry]   = useState("");                // text input
  const [tone, setTone]           = useState("");                // text input
  const [length, setLength]       = useState(1);                 // numeric input
  const [results, setResults]     = useState<GeneratedItem[]>([]); // API data
  const [error, setError]         = useState("");                // error banner
  const [loading, setLoading]     = useState(false);             // spinner flag

  /* ------ Handler for the form submit ---------------------------- */
  async function handleGenerate(e: FormEvent) {
    e.preventDefault();            // stop normal page reload
    setError("");
    setResults([]);
    setLoading(true);

    try {
      const res = await fetch("/api/generate-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, tone, length }),
      });

      /* If the route returns any status !== 200 we throw an error so */
      /* it lands in the catch block below.                           */
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Unknown error");
      }

      /* The API shape is { results: GeneratedItem[] }                */
      const { results } = await res.json() as { results: GeneratedItem[] };

      setResults(results);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unexpected error, see console");
      /* eslint-disable-next-line no-console */
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /* ------ JSX ---------------------------------------------------- */
  return (
    <section className="w-full max-w-xl mt-8">
      <h2 className="font-semibold mb-2">Generate sample captions</h2>

      {/* ---- form ---- */}
      <form onSubmit={handleGenerate} className="flex flex-col gap-3">
        <input
          className="border rounded p-2"
          type="text"
          placeholder="Industry e.g. coffee"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          required
        />
        <input
          className="border rounded p-2"
          type="text"
          placeholder="Tone e.g. playful"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          required
        />
        <input
          className="border rounded p-2"
          type="number"
          min={1}
          max={10}
          placeholder="Number of captions"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          required
        />
        <button
          type="submit"
          className="rounded bg-foreground text-background h-10 px-4 hover:opacity-90 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {/* ---- error banner ---- */}
      {error && (
        <p className="text-red-600 mt-4 text-sm font-medium">{error}</p>
      )}

      {/* ---- generated results ---- */}
      {results.length > 0 && (
        <div className="mt-6 space-y-6">
          {results.map((item, idx) => (
            <figure
              key={idx}
              className="border rounded-lg overflow-hidden shadow-sm"
            >
              {/* optional Unsplash image */}
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.alt}
                  className="w-full h-56 object-cover"
                />
              )}
              <figcaption className="p-4 text-sm">{item.caption}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Presentational helpers (logo + footer)                         */
/* ------------------------------------------------------------------ */
function LogoAndTips() {
  return (
    <>
      <Image
        className="dark:invert"
        src="/next.svg"
        alt="Next.js logo"
        width={180}
        height={38}
        priority
      />

      <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
        <li className="mb-2 tracking-[-.01em]">
          Get started by editing{" "}
          <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
            src/app/page.tsx
          </code>
          .
        </li>
        <li className="tracking-[-.01em]">Save and see your changes instantly.</li>
      </ol>
    </>
  );
}

type FooterLinkProps = { href: string; icon: string; label: string };

function FooterLink({ href, icon, label }: FooterLinkProps) {
  return (
    <Link
      className="flex items-center gap-2 hover:underline hover:underline-offset-4"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image aria-hidden src={icon} alt="" width={16} height={16} />
      {label}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      <FooterLink
        href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
        icon="/file.svg"
        label="Learn"
      />
      <FooterLink
        href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
        icon="/window.svg"
        label="Examples"
      />
      <FooterLink
        href="https://nextjs.org"
        icon="/globe.svg"
        label="Go to nextjs.org →"
      />
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Home component – puts everything together                      */
/* ------------------------------------------------------------------ */
export default function Home() {
  const { data: session } = useSession(); // used only to decide whether to show PostGenerator

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {/* Header row: auth button */}
      <header className="row-start-1">
        <AuthButton />
      </header>

      {/* Main content row */}
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full">
        <LogoAndTips />

        {/* Only show the generator if user is logged in */}
        {session && <PostGenerator />}
      </main>

      {/* Footer row */}
      <Footer />
    </div>
  );
}




