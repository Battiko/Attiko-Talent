"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@attiko/api/router";

export const trpc = createTRPCReact<AppRouter>();
