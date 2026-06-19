import Anthropic from 'npm:@anthropic-ai/sdk';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, errorResponse } from '../_shared/auth.ts';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

interface Ride {
  duration: number;
  distance?: number;
  calories?: number;
}

function sanitizeRides(raw: unknown, maxLen: number): Ride[] | null {
  if (!Array.isArray(raw) || raw.length > maxLen) return null;
  return raw.map((r: any) => ({
    duration: Math.max(0, Math.min(1440, Number(r?.duration) || 0)),
    distance: r?.distance != null
      ? Math.max(0, Math.min(10_000, Number(r.distance)))
      : undefined,
    calories: r?.calories != null
      ? Math.max(0, Math.min(50_000, Number(r.calories)))
      : undefined,
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();

    const sport = body?.sport;
    const distanceUnit = body?.distanceUnit;

    if (sport !== 'cycling' && sport !== 'running') {
      return errorResponse(400, 'Invalid sport', req);
    }
    if (distanceUnit !== 'km' && distanceUnit !== 'miles') {
      return errorResponse(400, 'Invalid distanceUnit', req);
    }

    const newRides = sanitizeRides(body?.newRides, 200);
    const allRides = sanitizeRides(body?.allRides, 1000);
    if (!newRides || !allRides) {
      return errorResponse(400, 'Invalid rides payload', req);
    }
    if (newRides.length === 0) {
      return errorResponse(400, 'newRides must not be empty', req);
    }

    const toUnit = (km: number) => distanceUnit === 'km' ? km : km * 0.621371;
    const unit = distanceUnit;

    const newMins = newRides.reduce((s, r) => s + r.duration, 0);
    const newDist = toUnit(newRides.reduce((s, r) => s + (r.distance ?? 0), 0));
    const newCal  = newRides.reduce((s, r) => s + (r.calories ?? 0), 0);

    const allMins = allRides.length > 0
      ? allRides.reduce((s, r) => s + r.duration, 0) / allRides.length : 0;
    const allDist = allRides.length > 0
      ? toUnit(allRides.reduce((s, r) => s + (r.distance ?? 0), 0) / allRides.length) : 0;

    const userPrompt = `Just imported from Apple Health:
Sport: ${sport}
Sessions imported: ${newRides.length}
Total duration: ${newMins} min
Total distance: ${newDist.toFixed(1)} ${unit}${newCal > 0 ? `\nTotal calories: ${newCal} kcal` : ''}

Historical averages (${allRides.length} total sessions):
Avg duration: ${allMins.toFixed(0)} min/session
Avg distance: ${allDist.toFixed(1)} ${unit}/session`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      system: `You are a supportive fitness coach. Write exactly 1-2 sentences (max 35 words) recapping the user's just-synced workout data. Be specific with numbers. Note anything impressive versus their averages. Tone: warm, direct, like a coach glancing at their log. No emojis, no hashtags.`,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const insight = (message.content[0] as { type: string; text: string }).text;

    return new Response(JSON.stringify({ insight }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (_err: unknown) {
    return errorResponse(500, 'Internal server error', req);
  }
});
