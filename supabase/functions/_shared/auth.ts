import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from './cors.ts';

/** Max AI function calls per user per rolling hour. */
const RATE_LIMIT_PER_HOUR = 50;

export type AuthResult = { userId: string };

/**
 * Verifies the Bearer JWT in the request, then atomically enforces a per-user
 * hourly rate limit via the check_and_log_ai_call RPC (eliminates TOCTOU race).
 *
 * Returns { userId } on success, or a ready-to-return Response on failure.
 */
export async function requireAuth(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(401, 'Unauthorized', req);
  }

  const token = authHeader.slice(7);

  // Admin client validates the JWT server-side (not just local decode).
  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
  // by the Supabase Edge Function runtime.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) {
    return errorResponse(401, 'Unauthorized', req);
  }

  // Reject the anon key used as a bare token (it decodes to a JWT but has no user).
  if (!user.email && !user.phone) {
    return errorResponse(401, 'Unauthorized', req);
  }

  // Atomic rate limit: acquires a per-user advisory lock inside the DB so
  // concurrent requests cannot all pass the count check simultaneously (TOCTOU fix).
  const { data: allowed, error: rpcError } = await adminClient
    .rpc('check_and_log_ai_call', {
      p_user_id: user.id,
      p_limit: RATE_LIMIT_PER_HOUR,
    });

  if (rpcError || !allowed) {
    return errorResponse(429, 'Rate limit exceeded. Try again in an hour.', req);
  }

  return { userId: user.id };
}

export function errorResponse(status: number, message: string, req?: Request): Response {
  const headers: Record<string, string> = {
    ...(req ? getCorsHeaders(req) : {}),
    'Content-Type': 'application/json',
  };
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
