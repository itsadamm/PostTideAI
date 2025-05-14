"use client"; // makes this file a Client Component

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

export default function Providers({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>;
}
