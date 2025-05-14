/* --------------------------------------------------------------------------
   Home page – now wired for authentication + caption generation
   --------------------------------------------------------------------------
   - Uses NextAuth’s useSession / signIn / signOut helpers
   - Provides a small form to POST to /api/generate-posts
   - Keeps your original layout / branding intact
   ------------------------------------------------------------------------ */

   "use client"; // <-  Required: enables client-side hooks in this component

   import Image from "next/image";
   import Link from "next/link";
   import { useState, FormEvent } from "react";
   import { signIn, signOut, useSession } from "next-auth/react";
   
   /* ------------------------------------------------------------------ */
   /*   AUTH BUTTON – log in / log out                                */
   /* ------------------------------------------------------------------ */
   function AuthButton() {
     const { data: session, status } = useSession();
   
     if (status === "loading") return null; // avoid flicker
   
     return session ? (
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
       <button
         onClick={() => signIn("google")}
         className="rounded bg-blue-600 text-white px-3 py-1 text-sm hover:bg-blue-500"
       >
         Sign in with Google
       </button>
     );
   }
   
   /* ------------------------------------------------------------------ */
   /*   POST GENERATOR – form + results                               */
   /* ------------------------------------------------------------------ */
   function PostGenerator() {
     const [industry, setIndustry] = useState("");
     const [tone, setTone] = useState("");
     const [length, setLength] = useState(1);
     const [captions, setCaptions] = useState<string[]>([]);
     const [error, setError] = useState("");
   
     async function handleGenerate(e: FormEvent) {
       e.preventDefault();
       setCaptions([]);
       setError("");
   
       try {
         const res = await fetch("/api/generate-posts", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ industry, tone, length }),
         });
   
         if (!res.ok) {
           const { error } = await res.json();
           throw new Error(error ?? "Unknown error");
         }
   
         const { captions } = await res.json();
         setCaptions(captions);
       } catch (err: unknown) {
         /* eslint-disable no-console */
         if (err instanceof Error) setError(err.message);
         else setError("Unexpected error, see console");
         console.error(err);
       }
     }
   
     return (
       <section className="w-full max-w-xl mt-8">
         <h2 className="font-semibold mb-2">Generate sample captions</h2>
   
         {/* ---- form ---- */}
         <form onSubmit={handleGenerate} className="flex flex-col gap-3">
           <input
             className="border rounded p-2"
             type="text"
             placeholder="Industry e.g. fitness"
             value={industry}
             onChange={(e) => setIndustry(e.target.value)}
             required
           />
           <input
             className="border rounded p-2"
             type="text"
             placeholder="Tone e.g. motivational"
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
             className="rounded bg-foreground text-background h-10 px-4 hover:opacity-90"
           >
             Generate
           </button>
         </form>
   
         {/* ---- error / results ---- */}
         {error && <p className="text-red-600 mt-4 text-sm font-medium">{error}</p>}
   
         {captions.length > 0 && (
           <ul className="mt-4 list-disc list-inside space-y-2">
             {captions.map((c, i) => (
               <li key={i} className="text-sm">
                 {c}
               </li>
             ))}
           </ul>
         )}
       </section>
     );
   }
   
   /* ------------------------------------------------------------------ */
   /*   PRESENTATIONAL helpers (logo, footer links)                   */
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
   /*   HOME PAGE COMPONENT                                           */
   /* ------------------------------------------------------------------ */
   export default function Home() {
     const { data: session } = useSession();
   
     return (
       <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
         {/* ---- header with auth ---- */}
         <header className="row-start-1">
           <AuthButton />
         </header>
   
         {/* ---- main ---- */}
         <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full">
           <LogoAndTips />
   
           {/* show generator only when signed in */}
           {session && <PostGenerator />}
         </main>
   
         {/* ---- footer ---- */}
         <Footer />
       </div>
     );
   }
   







// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
//       <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={180}
//           height={38}
//           priority
//         />
//         <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
//           <li className="mb-2 tracking-[-.01em]">
//             Get started by editing{" "}
//             <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
//               src/app/page.tsx
//             </code>
//             .
//           </li>
//           <li className="tracking-[-.01em]">
//             Save and see your changes instantly.
//           </li>
//         </ol>

//         <div className="flex gap-4 items-center flex-col sm:flex-row">
//           <a
//             className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={20}
//               height={20}
//             />
//             Deploy now
//           </a>
//           <a
//             className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Read our docs
//           </a>
//         </div>
//       </main>
//       <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/file.svg"
//             alt="File icon"
//             width={16}
//             height={16}
//           />
//           Learn
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/window.svg"
//             alt="Window icon"
//             width={16}
//             height={16}
//           />
//           Examples
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/globe.svg"
//             alt="Globe icon"
//             width={16}
//             height={16}
//           />
//           Go to nextjs.org →
//         </a>
//       </footer>
//     </div>
//   );
// }
