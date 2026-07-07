/**
 * POST /api/analytics
 * Receives an analytics event from the client, enriches it with the
 * real visitor IP (from Vercel headers), then posts a rich embed to Discord.
 * The webhook URL is kept server-side only — never exposed to the browser.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

interface AnalyticsEvent {
  type: 'page_visit' | 'dice_roll' | 'damage_calculated' | 'tab_switch';
  details?: Record<string, string | number | boolean>;
  userAgent?: string;
  page?: string;
}

// Discord embed color per event type
const EVENT_COLORS: Record<string, number> = {
  page_visit:         0x5865F2, // Discord blurple
  dice_roll:          0xF59E0B, // Amber
  damage_calculated:  0xEF4444, // Red
  tab_switch:         0x6B7280, // Gray
};

const EVENT_ICONS: Record<string, string> = {
  page_visit:         '👁️',
  dice_roll:          '🎲',
  damage_calculated:  '⚔️',
  tab_switch:         '🔀',
};

const EVENT_TITLES: Record<string, string> = {
  page_visit:         'New Visitor',
  dice_roll:          'Dice Rolled',
  damage_calculated:  'Damage Calculated',
  tab_switch:         'Tab Switched',
};

function getClientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back through common proxy headers
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first is the real client
    return forwarded.split(',')[0].trim();
  }
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    'Unknown'
  );
}

function formatDetails(details: Record<string, string | number | boolean> = {}): string {
  return Object.entries(details)
    .map(([k, v]) => `**${k}:** ${v}`)
    .join('\n') || '_No details_';
}

function formatUserAgent(ua: string = ''): string {
  if (!ua) return 'Unknown';
  // Extract browser & OS from UA string
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] ?? 'Unknown Browser';
  const os = ua.match(/\((.*?)\)/)?.[1]?.split(';')[0] ?? 'Unknown OS';
  return `${browser} on ${os}`;
}

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  // Silently succeed if no webhook is configured
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return Response.json({ ok: true, skipped: true });
  }

  try {
    const body: AnalyticsEvent = await req.json();
    const ip = getClientIp(req);
    const now = new Date();

    const embed = {
      title: `${EVENT_ICONS[body.type] ?? '📌'} ${EVENT_TITLES[body.type] ?? body.type}`,
      color: EVENT_COLORS[body.type] ?? 0x5865F2,
      fields: [
        {
          name: '🌐 IP Address',
          value: `\`${ip}\``,
          inline: true,
        },
        {
          name: '🕐 Time',
          value: now.toLocaleString('en-US', { timeZone: 'UTC', hour12: false }) + ' UTC',
          inline: true,
        },
        {
          name: '📄 Page',
          value: body.page ?? '/',
          inline: true,
        },
        {
          name: '🖥️ Browser',
          value: formatUserAgent(body.userAgent),
          inline: false,
        },
        ...(body.details && Object.keys(body.details).length > 0
          ? [{
              name: '📋 Details',
              value: formatDetails(body.details),
              inline: false,
            }]
          : []),
      ],
      footer: {
        text: 'D&D Damage Calculator · Analytics',
      },
      timestamp: now.toISOString(),
    };

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'DnD Calculator',
        avatar_url: 'https://em-content.zobj.net/source/twitter/376/crossed-swords_2694-fe0f.png',
        embeds: [embed],
      }),
    });

    if (!discordRes.ok) {
      console.error('[analytics] Discord webhook failed:', discordRes.status, await discordRes.text());
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[analytics] Error:', err);
    // Never fail the user's request because of analytics
    return Response.json({ ok: true });
  }
}
