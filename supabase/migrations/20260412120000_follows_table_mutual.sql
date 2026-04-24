/**
 * Follow-Beziehungen (wer wem folgt) fuer Chat-Kontext und spaetere Social-Features.
 *
 * Start-Setup: Alle bestehenden Profile folgen sich paarweise gegenseitig (jede Richtung).
 * Neue Profile: Trigger traegt automatisch Follows zu allen anderen und zurueck ein.
 *
 * Hinweis: Migration als Supabase SQL ausfuehren (CLI oder Dashboard).
 */

-- ── Tabelle ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT follows_pk PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows (following_id);

COMMENT ON TABLE public.follows IS 'Gerichtete Follow-Kante: follower_id folgt following_id.';

-- ── RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Lesen: nur Kanten, an denen man beteiligt ist (eigene Follows / Follower)
DROP POLICY IF EXISTS "follows_select_if_involved" ON public.follows;
CREATE POLICY "follows_select_if_involved"
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

-- Einfuegen / Loeschen: nur als Follower (eigene Kante)
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own"
  ON public.follows
  FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own"
  ON public.follows
  FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- ── Trigger: neues Profil <-> alle anderen gegenseitig folgen ────────────

CREATE OR REPLACE FUNCTION public.follows_sync_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Neues Profil folgt allen bestehenden
  INSERT INTO public.follows (follower_id, following_id)
  SELECT NEW.id, p.id
  FROM public.profiles p
  WHERE p.id <> NEW.id
  ON CONFLICT DO NOTHING;

  -- Alle bestehenden folgen dem neuen Profil
  INSERT INTO public.follows (follower_id, following_id)
  SELECT p.id, NEW.id
  FROM public.profiles p
  WHERE p.id <> NEW.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_profile_insert_follows ON public.profiles;
CREATE TRIGGER after_profile_insert_follows
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.follows_sync_new_profile();

-- ── Einmaliger Backfill: alle Paare (a -> b), a <> b ─────────────────────

INSERT INTO public.follows (follower_id, following_id)
SELECT a.id, b.id
FROM public.profiles a
CROSS JOIN public.profiles b
WHERE a.id <> b.id
ON CONFLICT DO NOTHING;
