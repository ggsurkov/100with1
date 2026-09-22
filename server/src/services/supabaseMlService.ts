// Клиент RPC-функции Supabase `create_game` — внешнего ML-сервиса, который
// генерирует вопросы игры. Axios на сервере нет, поэтому используем глобальный
// fetch (Node 18+) и AbortController для таймаута.

if (!process.env.SUPABASE_ML_URL || !process.env.SUPABASE_ML_KEY) {
  console.warn('[Supabase ML] Warning: Missing SUPABASE_ML_URL or SUPABASE_ML_KEY in .env');
}

// Генерация вопросов идёт долго — 20 секунд на весь запрос.
const REQUEST_TIMEOUT_MS = 20_000;

export interface GameRoundSpec {
  roundNumber: number;
  questionCount: number;
  roundType: string;
}

export interface GenerateGamePayload {
  userLogin: string;
  gameTitle: string;
  gameDescription: string;
  isApllyUsedQuestion: boolean;
  themes: string[];
  mechanics: string[];
  ratings: string[];
  gameSpec: GameRoundSpec[];
}

// Ошибка внешнего сервиса: `data` — тело ответа Supabase, если оно пришло.
export class SupabaseMlError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'SupabaseMlError';
    this.status = status;
    this.data = data;
  }
}

export async function callGenerateGame(payload: GenerateGamePayload): Promise<any> {
  const url = process.env.SUPABASE_ML_URL;
  const key = process.env.SUPABASE_ML_KEY;
  if (!url || !key) {
    throw new SupabaseMlError('SUPABASE_ML_URL and SUPABASE_ML_KEY are not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/rpc/create_game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      // RPC ожидает единственный аргумент `p_json` — payload заворачивается в него.
      body: JSON.stringify({ p_json: payload }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new SupabaseMlError(`Request timed out after ${REQUEST_TIMEOUT_MS} ms`);
    }
    throw new SupabaseMlError(err?.message || 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  console.log('[Supabase ML] Game generation response status:', response.status);

  const raw = await response.text();
  let data: any = raw;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Не-JSON тело отдаём как есть — оно попадёт в лог ошибки.
  }

  if (!response.ok) {
    throw new SupabaseMlError(`Supabase responded with ${response.status}`, response.status, data);
  }

  return data;
}



// --- Приведение ответа ML-сервиса к схеме модели Game --------------------------
//
// Точный формат ответа `create_game` не зафиксирован, поэтому нормализация
// намеренно терпимая. Поддерживаются четыре формы:
//   1. { game: { title, rounds: [...] } }         — объект игры в обёртке;
//   2. [ { ... } ]                                — PostgREST-обёртка в массив;
//   3. { title, rounds: [...] } | { questions: [...] } — плоский объект игры;
//   4. [ { title, answers: [...] }, ... ]         — плоский список вопросов.
// Форма 4 укладывается в один раунд.

const isPlainObject = (value: any): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const firstString = (...values: any[]): string => {
  const found = values.find(value => typeof value === 'string' && value.trim() !== '');
  return found ? String(found).trim() : '';
};

const firstNumber = (...values: any[]): number | undefined =>
  values.find(value => typeof value === 'number' && Number.isFinite(value));

// Снимает обёртки, в которые PostgREST и сам RPC могут завернуть игру.
function unwrap(raw: any): any {
  let current = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    // Массив из одного объекта без `answers` — обёртка PostgREST, а не список вопросов.
    if (Array.isArray(current) && current.length === 1 && isPlainObject(current[0]) && !current[0].answers) {
      current = current[0];
      continue;
    }
    if (isPlainObject(current)) {
      const inner = current.game ?? current.result ?? current.data;
      if (isPlainObject(inner) || Array.isArray(inner)) {
        current = inner;
        continue;
      }
    }
    break;
  }
  return current;
}

function mapAnswer(raw: any, index: number) {
  const popularity = firstNumber(raw?.popularity, raw?.percent, raw?.score);
  return {
    text: firstString(raw?.text, raw?.answer, raw?.title, typeof raw === 'string' ? raw : ''),
    hint: firstString(raw?.hint),
    orderNumber: firstNumber(raw?.orderNumber, raw?.order) ?? index + 1,
    points: firstNumber(raw?.points) ?? popularity ?? 0,
    hide: true,
    popularity: popularity === undefined ? 0 : Math.max(0, Math.min(100, Math.round(popularity))),
  };
}

function mapQuestion(raw: any, index: number) {
  const answers = Array.isArray(raw?.answers) ? raw.answers : [];
  return {
    title: firstString(raw?.title, raw?.question, raw?.text),
    hint: firstString(raw?.hint),
    timer: firstNumber(raw?.timer) ?? 60,
    orderNumber: firstNumber(raw?.orderNumber, raw?.order) ?? index + 1,
    imageUrl: firstString(raw?.imageUrl, raw?.image_url) || undefined,
    answers: answers.map(mapAnswer),
  };
}

function mapRound(raw: any, index: number) {
  const questions = Array.isArray(raw?.questions) ? raw.questions : [];
  return {
    orderNumber: firstNumber(raw?.orderNumber, raw?.roundNumber, raw?.round_number) ?? index + 1,
    type: firstNumber(raw?.type) ?? 1,
    hint: firstString(raw?.hint, raw?.roundType, raw?.round_type),
    questions: questions.map(mapQuestion),
  };
}

export function normalizeGeneratedGame(raw: any, payload: GenerateGamePayload) {
  const source = unwrap(raw);
  const gameObject: Record<string, any> = isPlainObject(source) ? source : {};

  let rawRounds: any[];
  if (Array.isArray(source)) {
    // Список раундов или список вопросов — отличаем по наличию `questions`.
    rawRounds = source.some(item => Array.isArray(item?.questions)) ? source : [{ questions: source }];
  } else if (isPlainObject(source) && Array.isArray(source.rounds)) {
    rawRounds = source.rounds;
  } else if (isPlainObject(source) && Array.isArray(source.questions)) {
    rawRounds = [{ questions: source.questions }];
  } else {
    throw new SupabaseMlError('ML response contains no rounds or questions', undefined, raw);
  }

  const rounds = rawRounds.map(mapRound);
  const hasQuestions = rounds.some(round => round.questions.length > 0);
  if (!hasQuestions) {
    throw new SupabaseMlError('ML response contains no questions', undefined, raw);
  }

  return {
    title: firstString(gameObject.title, payload.gameTitle),
    description: firstString(gameObject.description, payload.gameDescription),
    status: 'active' as const,
    rounds,
  };
}

export default { callGenerateGame, normalizeGeneratedGame };
