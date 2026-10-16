import { CATEGORY_PALETTE, FALLBACK_COLOR } from './chart-colors';
import { LineSeries, SeriesPoint } from './multi-line-chart.component';
import { ScoreItem } from './score-bars.component';

/** Puntaje a 0–100 con un decimal. */
function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

/** Puntaje máximo de una respuesta en la rúbrica (escala 0–5). */
export const MAX_RUBRIC_SCORE = 5;

/** Puntaje de la rúbrica (0–5, también promedios) a porcentaje entero 0–100. */
export function rubricScoreToPct(score: number): number {
  return Math.max(0, Math.min(100, Math.round((score / MAX_RUBRIC_SCORE) * 100)));
}

/** Nota de la rúbrica (0–5, también promedios) con un decimal. */
export function rubricGrade(score: number): number {
  return Math.round(Math.max(0, Math.min(MAX_RUBRIC_SCORE, score)) * 10) / 10;
}

/** Diferencia entre dos notas, con un decimal. */
export function gradeDelta(current: number, previous: number): number {
  return Math.round((current - previous) * 10) / 10;
}

/** Score (0–1) a porcentaje entero 0–100. */
export function scoreToPct(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

/**
 * Una serie por tema: el backend manda varios puntos por tema, uno por evaluación, y el
 * `index` dice cuál es (0 = la primera). El puntaje ya viene de 0 a 100. El color de cada tema
 * sale de la paleta por orden de aparición.
 */
export function buildTopicSeries(profile: { topic: string; score: number; index: number }[]): LineSeries[] {
  const byTopic = new Map<string, SeriesPoint[]>();
  for (const item of profile) {
    const points = byTopic.get(item.topic) ?? [];
    points.push({ x: item.index, value: clampPct(item.score) });
    byTopic.set(item.topic, points);
  }
  return [...byTopic].map(([topic, points], i) => ({
    key: topic,
    label: topic,
    color: CATEGORY_PALETTE[i] ?? FALLBACK_COLOR,
    points: points.sort((p, q) => p.x - q.x),
  }));
}

/**
 * Perfil de conocimiento actual (puntaje 0–100 por tema, ya en porcentaje) como barras. Cada tema lleva el
 * mismo color que su línea en las series, si ya se conoce.
 */
export function buildProfileItems(profile: { topic: string; score: number }[], series: LineSeries[]): ScoreItem[] {
  const colors = new Map(series.map((s) => [s.key, s.color]));
  return profile.map((p) => ({
    key: p.topic,
    label: p.topic,
    value: clampPct(p.score),
    color: colors.get(p.topic),
  }));
}
