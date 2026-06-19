import Anthropic from 'npm:@anthropic-ai/sdk';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, errorResponse } from '../_shared/auth.ts';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

interface Ride {
  date: string;
  duration: number;
  distance?: number;
  calories?: number;
}

function sanitizeRides(raw: unknown, maxLen: number): Ride[] | null {
  if (!Array.isArray(raw) || raw.length > maxLen) return null;
  return raw.map((r: any) => ({
    date: typeof r?.date === 'string' ? r.date.slice(0, 30) : new Date().toISOString(),
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
    const period = body?.period;

    if (sport !== 'cycling' && sport !== 'running') {
      return errorResponse(400, 'Invalid sport', req);
    }
    if (distanceUnit !== 'km' && distanceUnit !== 'miles') {
      return errorResponse(400, 'Invalid distanceUnit', req);
    }
    if (period !== 'weekly' && period !== 'monthly') {
      return errorResponse(400, 'Invalid period', req);
    }

    const currentStreak = Math.max(0, Math.min(3650, Number(body?.currentStreak) || 0));
    const longestStreak = Math.max(0, Math.min(3650, Number(body?.longestStreak) || 0));
    const weeklyGoal    = Math.max(1, Math.min(50,   Number(body?.weeklyGoal)    || 1));

    const rides = sanitizeRides(body?.rides, 1000);
    if (!rides) return errorResponse(400, 'Invalid rides payload', req);

    const days = period === 'weekly' ? 7 : 30;
    const unit = distanceUnit;
    const toUnit = (km: number) => unit === 'km' ? km : km * 0.621371;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const periodRides = rides.filter(r => new Date(r.date) >= cutoff);

    const totalMins    = periodRides.reduce((s, r) => s + r.duration, 0);
    const totalDistKm  = periodRides.reduce((s, r) => s + (r.distance ?? 0), 0);
    const totalDist    = toUnit(totalDistKm);
    const avgMins      = periodRides.length > 0 ? totalMins / periodRides.length : 0;
    const avgDist      = periodRides.length > 0 ? totalDist / periodRides.length : 0;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    periodRides.forEach(r => { dayCounts[new Date(r.date).getDay()]++; });
    const dayBreakdown = dayNames.map((name, i) => `${name}: ${dayCounts[i]}`).join(', ');

    const weeksInPeriod = days / 7;
    const avgPerWeek    = (periodRides.length / weeksInPeriod).toFixed(1);

    const userPrompt = `Sport: ${sport}
Period: last ${days} days (${period})
Sessions: ${periodRides.length} (avg ${avgPerWeek}/week vs goal of ${weeklyGoal}/week)
Total duration: ${totalMins} min
Total distance: ${totalDist.toFixed(1)} ${unit}
Avg per session: ${avgMins.toFixed(0)} min, ${avgDist.toFixed(1)} ${unit}
Day-of-week breakdown: ${dayBreakdown}
Current streak: ${currentStreak} days | Longest streak: ${longestStreak} days`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      system: `You are a supportive fitness coach writing a ${period} training review. Write 3 sentences: (1) note a specific day-of-week or consistency pattern, (2) highlight one strong aspect of the data, (3) give ONE concrete, actionable improvement tip specific to the numbers. Max 65 words total. No emojis, no hashtags.`,
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
