/**
 * Reparatur / Nachziehen: fuer alle Profile alle gerichteten Follow-Kanten (a -> b, a <> b).
 * Idempotent durch ON CONFLICT DO NOTHING (fehlende Eintraege werden ergaenzt).
 *
 * Nutzen: wenn nach dem ersten Follow-Setup neue Profile dazukamen oder der Backfill
 * unvollstaendig war.
 */

INSERT INTO public.follows (follower_id, following_id)
SELECT a.id, b.id
FROM public.profiles a
CROSS JOIN public.profiles b
WHERE a.id <> b.id
ON CONFLICT DO NOTHING;
