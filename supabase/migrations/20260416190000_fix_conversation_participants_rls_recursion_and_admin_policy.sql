-- Fix 42P17 infinite recursion on conversation_participants + Admin-Rollen-Updates.
--
-- Ursache:
-- 1) Policy "Admins can update member roles" enthielt einen fehlerhaften EXISTS-Subquery
--    (conversation_participants_1.conversation_id = conversation_participants_1.conversation_id),
--    statt Korrelation zur Zeile unter UPDATE.
-- 2) Direkte SELECTs auf conversation_participants innerhalb von Policies triggern wieder
--    SELECT-RLS; get_my_* Funktionen lesen dieselbe Tabelle — ohne row_security=off entsteht
--    verschachtelte Policy-Auswertung (42P17).
--
-- SECURITY DEFINER allein reicht nicht: RLS gilt fuer den Session-User (Invoker), siehe PG-Doku.

ALTER FUNCTION public.get_my_conversation_ids() SET row_security TO off;
ALTER FUNCTION public.get_my_admin_conversation_ids() SET row_security TO off;

DROP POLICY IF EXISTS "Admins can update member roles" ON public.conversation_participants;

CREATE POLICY "Admins can update member roles"
  ON public.conversation_participants
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (SELECT public.get_my_admin_conversation_ids())
  )
  WITH CHECK (
    conversation_id IN (SELECT public.get_my_admin_conversation_ids())
  );

COMMENT ON POLICY "Admins can update member roles" ON public.conversation_participants IS
  'Gruppen-Admins duerfen Teilnehmerrollen (z. B. admin/member) in ihrer Konversation aendern.';
