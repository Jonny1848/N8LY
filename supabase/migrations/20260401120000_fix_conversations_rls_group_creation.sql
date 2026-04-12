/**
 * ENTWURF / alternativer Policy-Satz (andere Policy-Namen als in Production).
 * Das aktive Projekt nutzt u.a. participants_insert_own und conversations_select_own;
 * die Korrektur liegt in: 20260402120000_fix_rls_group_bulk_participant_insert.sql
 * (bereits per MCP auf Remote angewendet).
 *
 * Diese Datei NICHT ungeprueft auf dieselbe DB anwenden, wenn dort schon Policies existieren.
 */

-- ── conversations ──

-- Ersteller darf Zeilen anlegen (direct + group)
DROP POLICY IF EXISTS "conversations_insert_if_creator" ON public.conversations;
CREATE POLICY "conversations_insert_if_creator"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Lesen: eigene erstellte Konversation ODER Teilnehmer
DROP POLICY IF EXISTS "conversations_select_creator_or_participant" ON public.conversations;
CREATE POLICY "conversations_select_creator_or_participant"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.conversation_participants p
      WHERE p.conversation_id = conversations.id
        AND p.user_id = auth.uid()
    )
  );

-- Optional: Update nur fuer Admins / Ersteller – anpassen falls ihr Updates nutzt
DROP POLICY IF EXISTS "conversations_update_creator" ON public.conversations;
CREATE POLICY "conversations_update_creator"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ── conversation_participants ──

-- Ersteller der Konversation darf alle initialen Teilnehmer eintragen
DROP POLICY IF EXISTS "conversation_participants_insert_by_conversation_creator" ON public.conversation_participants;
CREATE POLICY "conversation_participants_insert_by_conversation_creator"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
  );

-- Lesen: alle Teilnehmer-Zeilen einer Konversation, in der man selbst dabei ist
DROP POLICY IF EXISTS "conversation_participants_select_same_conversation" ON public.conversation_participants;
CREATE POLICY "conversation_participants_select_same_conversation"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants me
      WHERE me.conversation_id = conversation_participants.conversation_id
        AND me.user_id = auth.uid()
    )
  );
