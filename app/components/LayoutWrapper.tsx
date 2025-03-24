
"use client"

import { usePathname } from "next/navigation"
import {
  ClerkProvider,
  SignIn,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs"

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = pathname === "/" // Allow unauthenticated access only on landing page

  return (
    <ClerkProvider>
      {!isPublicPage && (
        <header className="flex justify-end items-center p-4 gap-4 h-16">
          <SignedOut>
            <SignInButton />
            <SignUpButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </header>
      )}
      <main className="flex items-center justify-center min-h-screen">
        {isPublicPage ? children : (
          <>
            <SignedOut>
              <SignIn routing="hash" />
            </SignedOut>
            <SignedIn>
              {children}
            </SignedIn>
          </>
        )}
      </main>
    </ClerkProvider>
  )
}
