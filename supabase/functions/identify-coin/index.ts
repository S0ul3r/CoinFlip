import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COIN_IDENTIFICATION_PROMPT = `Jesteś ekspertem numizmatycznym specjalizującym się w polskich monetach.
Przeanalizuj dokładnie zdjęcie monety i zwróć informacje w formacie JSON.

Odpowiedź TYLKO w JSON, bez żadnego tekstu przed lub po:
{
  "name": "pełna nazwa monety",
  "year": 2024,
  "denomination": 200,
  "denomination_currency": "PLN",
  "series": "nazwa serii jeśli znana",
  "material": "złoto|srebro|miedź|stop",
  "mint": "Mennica Polska|NBP|nieznana",
  "condition_estimate": "G|VG|F|VF|EF|UNC",
  "confidence": 0.95,
  "description": "krótki opis monety",
  "is_commemorative": true,
  "notes": "dodatkowe uwagi"
}

Jeśli nie możesz zidentyfikować monety jako polskiej, napisz w polu "notes": "Nie rozpoznano polskiej monety".
Skup się na szczegółach: inskrypcje, herb, godło, daty, nominał.`;

function parseModelJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  const brace = candidate.match(/\{[\s\S]*\}/);
  if (!brace) throw new Error('Model response did not contain JSON object');
  return JSON.parse(brace[0]!) as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as {
      image_base64?: string;
      media_type?: string;
    };
    if (!body.image_base64) {
      return new Response(JSON.stringify({ error: 'image_base64 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mediaType = body.media_type ?? 'image/jpeg';
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server missing ANTHROPIC_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-3-5-sonnet-20241022';

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: body.image_base64,
                },
              },
              { type: 'text', text: COIN_IDENTIFICATION_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic error', anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: 'Anthropic request failed', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicJson = (await anthropicRes.json()) as {
      content?: { type: string; text?: string }[];
    };
    const textBlock = anthropicJson.content?.find((c) => c.type === 'text');
    const rawText = textBlock?.text ?? '';
    const parsed = parseModelJson(rawText);

    const result = {
      name: String(parsed.name ?? 'Nieznana moneta'),
      year: typeof parsed.year === 'number' ? parsed.year : null,
      denomination: typeof parsed.denomination === 'number' ? parsed.denomination : null,
      denomination_currency: String(parsed.denomination_currency ?? 'PLN'),
      series: parsed.series != null ? String(parsed.series) : null,
      material: parsed.material != null ? String(parsed.material) : null,
      mint: parsed.mint != null ? String(parsed.mint) : null,
      condition_estimate: parsed.condition_estimate != null ? String(parsed.condition_estimate) : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      description: parsed.description != null ? String(parsed.description) : null,
      is_commemorative: Boolean(parsed.is_commemorative),
      notes: parsed.notes != null ? String(parsed.notes) : null,
    };

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
