import { NextResponse } from "next/server";
import type { User } from "@/app/generated/prisma";
import { getCurrentDbUser, isDatabaseUnreachable } from "./user";

/**
 * Resolve the signed-in user for a route handler, or hand back the response
 * to return instead.
 *
 * Every account route needs the same three answers — 401 when signed out,
 * 503 when the database is asleep, 500 otherwise — and writing them out five
 * times is how they drift apart.
 */
export type AuthOutcome =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export async function requireUser(signedOutMessage: string): Promise<AuthOutcome> {
  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: signedOutMessage }, { status: 401 }),
      };
    }

    return { ok: true, user };
  } catch (error) {
    return { ok: false, response: databaseErrorResponse(error, "Your account could not be read.") };
  }
}

/** A 503 when the database is merely unreachable, a 500 when it is our bug.
 *  Neon suspends idle projects, so the first case is a normal state. */
export function databaseErrorResponse(error: unknown, fallback: string): NextResponse {
  if (isDatabaseUnreachable(error)) {
    return NextResponse.json(
      { error: "The database is unavailable. Nothing was changed." },
      { status: 503 },
    );
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** Parse a JSON body, or hand back the 400 to return instead. */
export async function readJson<T>(
  req: Request,
): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: (await req.json()) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Expected a JSON body." }, { status: 400 }),
    };
  }
}

/** Account data is per-user and changes on every write, so it is never
 *  cached at the edge. */
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;
