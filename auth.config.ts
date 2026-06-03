import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@/lib/auth/rbac';

const PUBLIC_PATHS = ['/sign-in'];

/**
 * Edge-safe Auth.js config (no DB / Node-only imports). Used by `middleware.ts`
 * to verify the JWT and gate routes. The Credentials provider — which needs the
 * database and bcrypt — is added in `auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: '/sign-in' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

      if (isPublic) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', request.nextUrl));
        }
        return true;
      }
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
