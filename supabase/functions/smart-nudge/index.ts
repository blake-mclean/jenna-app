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
}

function sanitizeRides(raw: unknown, maxLen: number): Ride[] | null {
  if (!Array.isArray(raw) || raw.length > maxLen) return null;
  return raw.map((r: any) => ({
    date: typeof r?.date === 'string' ? r.date.slice(0, 30) : new Date().toISOString(),
    duration: Math.max(0, Math.min(1440, Number(r?.duration) || 0)),
    distance: r?.distance != null
      ? Math.max(0, Math.min(10_000, Number(r.distance)))
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

    const currentStreak      = Math.max(0, Math.min(3650, Number(body?.currentStreak)      || 0));
    const longestStreak      = Math.max(0, Math.min(3650, Number(body?.longestStreak)      || 0));
    const weeklyGoal         = Math.max(1, Math.min(50,   Number(body?.weeklyGoal)         || 1));
    const ridesThisWeek      = Math.max(0, Math.min(50,   Number(body?.ridesThisWeek)      || 0));
    const achievementsEarned = Math.max(0, Math.min(500,  Number(body?.achievementsEarned) || 0));
    const totalAchievements  = Math.max(0, Math.min(500,  Number(body?.totalAchievements)  || 0));

    const rides = sanitizeRides(body?.rides, 200);
    if (!rides) return errorResponse(400, 'Invalid rides payload', req);

    // Sanitize challenge arrays — cap strings to prevent prompt injection.
    const MAX_STR = 80;
    const rawEnrolled = body?.enrolledChallenges;
    const enrolledChallenges: Array<{ name: string; pct: number }> = Array.isArray(rawEnrolled)
      ? rawEnrolled.slice(0, 20).map((c: any) => ({
          name: String(c?.name ?? '').slice(0, MAX_STR),
          pct:  Math.max(0, Math.min(100, Number(c?.pct) || 0)),
        }))
      : [];

    const rawAvailable = body?.availableChallenges;
    const availableChallenges: Array<{ name: string; description: string }> = Array.isArray(rawAvailable)
      ? rawAvailable.slice(0, 10).map((c: any) => ({
          name:        String(c?.name        ?? '').slice(0, MAX_STR),
          description: String(c?.description ?? '').slice(0, MAX_STR),
        }))
      : [];

    const toUnit = (km: number) => distanceUnit === 'km' ? km : km * 0.621371;
    const unit = distanceUnit;

    // Rides-per-week for the last 4 weeks.
    const weeksData = [1, 2, 3, 4].map((w) => {
      const end = new Date();
      end.setDate(end.getDate() - (w - 1) * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return rides.filter((r) => {
        const d = new Date(r.date);
        return d >= start && d < end;
      }).length;
    });
    const [, lastWeek, twoWeeksAgo, threeWeeksAgo] = weeksData;
    const avgLast3Weeks = ((lastWeek + twoWeeksAgo + threeWeeksAgo) / 3).toFixed(1);

    const totalMins    = rides.reduce((s, r) => s + r.duration, 0);
    const totalDistKm  = rides.reduce((s, r) => s + (r.distance ?? 0), 0);
    const avgMins      = rides.length > 0 ? (totalMins / rides.length).toFixed(0) : '0';
    const avgDist      = rides.length > 0 ? toUnit(totalDistKm / rides.length).toFixed(1) : '0';

    const challengeLines = enrolledChallenges.length > 0
      ? enrolledChallenges.map((c) => `  - "${c.name}" — ${c.pct}% complete`).join('\n')
      : '  None enrolled';

    const availableLines = availableChallenges.length > 0
      ? availableChallenges.map((c) => `  - "${c.name}": ${c.description}`).join('\n')
      : '  None';

    const userPrompt = `Sport: ${sport}
Weekly goal: ${weeklyGoal} sessions/week
This week: ${ridesThisWeek} | Last week: ${lastWeek} | Avg last 3 weeks: ${avgLast3Weeks}
Current streak: ${currentStreak} days | Longest ever: ${longestStreak} days
Avg session: ${avgMins} min, ${avgDist} ${unit} (over last 30 days, ${rides.length} sessions)
Achievements: ${achievementsEarned}/${totalAchievements} earned

Active challenges:
${challengeLines}

Available challenges (unenrolled):
${availableLines}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 80,
      system: `You are a personal fitness coach writing a one-sentence motivational nudge. Choose the most relevant angle from the data:
- If the user is consistently hitting or exceeding their weekly goal, acknowledge it warmly
- If their pace has dropped vs recent average, give a gentle, specific encouragement to get back on track
- If they have no active challenges and an available one clearly fits their current fitness level and pattern, recommend it by name
- If their goal seems misaligned with their actual pace (consistently over or under by 2+ sessions), suggest adjusting it
Write exactly one sentence. Max 35 words. Be specific with numbers. No emojis, no hashtags. Warm but direct coach voice.`,
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
