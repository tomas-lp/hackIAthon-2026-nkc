import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export function middleware(request: NextRequest) {
  return createClient(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
