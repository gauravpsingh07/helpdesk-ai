'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';

export async function signInAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' });
  } catch (error) {
    if (error instanceof AuthError) {
      return 'Invalid email or password.';
    }
    // Re-throw the Next.js redirect (success path) and anything unexpected.
    throw error;
  }
  return undefined;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/sign-in' });
}
