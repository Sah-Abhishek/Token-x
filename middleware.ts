import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes the middleware lets through. Each of these still performs its own
 * auth check; being listed here only means the middleware does not block the
 * request before the page or handler runs.
 *
 * /api is listed because the market routes are read-only and the Clerk
 * webhook authenticates with an svix signature rather than a session. Every
 * account route checks the session itself through `requireUser` and answers
 * 401; /api/orders/run checks CRON_SECRET instead.
 *
 * The account pages are listed for one reason: this app signs in through a
 * modal and has no /sign-in page to redirect to, so auth.protect() answered a
 * signed-out visitor with a 404. Each of these pages renders its own sign-in
 * prompt and reads no account data without a session.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/market(.*)",
  "/how-it-works",
  "/leaderboard(.*)",
  "/dashboard(.*)",
  "/watchlist(.*)",
  "/games(.*)",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
