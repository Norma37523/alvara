import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/saude"];

/**
 * Verificação otimista: renova a sessão e redireciona para login/MFA.
 * A autorização de verdade é feita no servidor (src/server/auth.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(items) {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { pathname } = request.nextUrl;
  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return PUBLIC_PATHS.includes(pathname) ? response : redirect("/login");
  }

  if (pathname === "/saude") return response;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const hasMfa = aal?.currentLevel === "aal2";

  if (!hasMfa && pathname !== "/mfa") return redirect("/mfa");
  if (hasMfa && (pathname === "/login" || pathname === "/mfa")) return redirect("/");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\.(?:png|svg|jpg|ico)$).*)"],
};
