import type { DefaultSession } from 'next-auth';
import type { Role } from '@/lib/auth/rbac';

declare module 'next-auth' {
  interface User {
    tenantId: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: Role;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    tenantId: string;
    role: Role;
  }
}
