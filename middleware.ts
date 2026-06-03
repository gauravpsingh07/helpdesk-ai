import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except Next internals, the auth API, and files with an extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
