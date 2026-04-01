-- Angewendet auf Projekt N8LY via Supabase MCP (Remote).
--
-- Ursache Gruppen-RLS-Fehler:
-- 1) participants_insert_own erlaubte nur user_id = auth.uid() ODER Admin in
--    get_my_admin_conversation_ids(). Diese Funktion liest nur bestehende
--    conversation_participants-Zeilen — beim Bulk-INSERT fehlen die noch.
-- 2) conversations_select_own nur get_my_conversation_ids(): nach INSERT der
--    Konversation existiert noch kein Participant → .select().single() scheitert.

DROP POLICY IF EXISTS "participants_insert_own" ON public.conversation_participants;

CREATE POLICY "participants_insert_own"
  ON public.conversation_participants
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id = auth.uid())
    OR (conversation_id IN (SELECT public.get_my_admin_conversation_ids()))
    OR (conversation_id IN (
         SELECT c.id FROM public.conversations c WHERE c.created_by = auth.uid()
       ))
  );

DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;

CREATE POLICY "conversations_select_own"
  ON public.conversations
  FOR SELECT
  TO public
  USING (
    (id IN (SELECT public.get_my_conversation_ids()))
    OR (created_by = auth.uid())
  );
