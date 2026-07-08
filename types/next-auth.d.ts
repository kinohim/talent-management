import type { DefaultSession } from "next-auth";

import type { UserRole } from "../generated/prisma/client";

declare module "next-auth" {
  interface User {
    employeeId: string;
    role: UserRole;
  }

  interface Session {
    user: {
      employeeId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    employeeId?: string;
    role?: UserRole;
  }
}
