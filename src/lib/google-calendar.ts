// Integración directa con Google Calendar API para generar el evento +
// link de Meet cuando el profesor confirma una reserva. Separado del
// login con Google (que usa Supabase Auth) — este es un OAuth2 propio
// porque necesitamos guardar el refresh_token para crear eventos después,
// no solo autenticar en el momento.

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPE =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/teacher/calendar/callback`;
}

export function getGoogleCalendarAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID no configurado");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // fuerza a que Google reemita el refresh_token siempre
    state,
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciales de Google no configuradas");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange falló: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciales de Google no configuradas");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh falló: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el email de Google");
  const data = (await res.json()) as { email: string };
  return data.email;
}

type CreateEventParams = {
  refreshToken: string;
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  attendeeEmails: string[];
};

type CreateEventResult = {
  meetLink: string | null;
  eventId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
};

// Crea el evento con conferenceData → Google genera el link de Meet solo.
export async function createCalendarEventWithMeet(
  params: CreateEventParams
): Promise<CreateEventResult> {
  const tokens = await refreshAccessToken(params.refreshToken);

  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?conferenceDataVersion=1`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startISO },
      end: { dateTime: params.endISO },
      attendees: params.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `yleis-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `No se pudo crear el evento en Google Calendar: ${res.status} ${await res.text()}`
    );
  }

  const event = (await res.json()) as {
    id: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  };

  const meetLink =
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
    null;

  return {
    meetLink,
    eventId: event.id,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
}
