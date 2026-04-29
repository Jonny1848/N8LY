-- ============================================================
-- poll_votes: Speichert Abstimmungen fuer Chat-Umfragen
-- ============================================================
--
-- Jede Zeile repraesentiert eine Abstimmung eines Users fuer eine
-- Poll-Nachricht (message_type = 'poll').
--
-- option_ids: Array von Option-IDs aus dem Poll-JSON in messages.content
-- Jeder User darf pro Umfrage nur einmal abstimmen (UNIQUE constraint).
-- Bei Multiple-Choice-Umfragen enthaelt option_ids mehrere Eintraege.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  uuid        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  -- public.profiles statt auth.users: PostgREST kann nur FK-Joins innerhalb von 'public' traversieren
  user_id     uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  option_ids  text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,

  -- Stellt sicher: pro User und Umfrage maximal eine Zeile (Upsert-Basis)
  CONSTRAINT poll_votes_once_per_user UNIQUE (message_id, user_id)
);

-- Index fuer schnellen Zugriff auf alle Stimmen einer Umfrage
CREATE INDEX IF NOT EXISTS poll_votes_message_id_idx ON public.poll_votes (message_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Alle Teilnehmer der Konversation, zu der die Umfrage gehoert,
-- duerfen die Stimmen lesen (nicht-anonym: wer hat was gewaehlt ist sichtbar)
CREATE POLICY "poll_votes_select_for_participants"
ON public.poll_votes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM   public.messages             m
    JOIN   public.conversation_participants cp
           ON cp.conversation_id = m.conversation_id
    WHERE  m.id         = poll_votes.message_id
      AND  cp.user_id   = auth.uid()
  )
);

-- Jeder eingeloggte User darf seine eigene Stimme abgeben
CREATE POLICY "poll_votes_insert_own"
ON public.poll_votes
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- User darf seine eigene Stimme aendern (z. B. Multiple-Choice-Anpassung)
CREATE POLICY "poll_votes_update_own"
ON public.poll_votes
FOR UPDATE TO authenticated
USING     (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE  public.poll_votes          IS 'Abstimmungen fuer Poll-Nachrichten im Chat';
COMMENT ON COLUMN public.poll_votes.option_ids IS 'Ausgewaehlte Option-IDs aus dem Poll-JSON (message.content)';
