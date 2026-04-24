-- Gruppen-Metadaten: Beschreibung + updated_at
-- RLS: Gruppen-Admins (conversation_participants.role = 'admin') duerfen die Zeile
--      ebenfalls aktualisieren, nicht nur created_by.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.conversations
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;

CREATE POLICY "conversations_update_creator_or_group_admin"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.conversation_participants p
    WHERE p.conversation_id = conversations.id
      AND p.user_id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.conversation_participants p
    WHERE p.conversation_id = conversations.id
      AND p.user_id = auth.uid()
      AND p.role = 'admin'
  )
);

COMMENT ON COLUMN public.conversations.description IS 'Optionale Gruppenbeschreibung (Gruppeninfo)';
