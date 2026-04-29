-- poll_votes: DELETE-Policy ergaenzen
-- Erlaubt dem abstimmenden User, seine eigene Stimme wieder zurueckzuziehen.
-- Wird benoetigt wenn der User die letzte/einzige gewaehlte Option wieder abwaehlt.

CREATE POLICY "poll_votes_delete_own"
ON public.poll_votes
FOR DELETE TO authenticated
USING (user_id = auth.uid());
