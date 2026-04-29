-- messages_message_type_check: 'file' und 'poll' ergaenzen
-- Der urspruengliche Constraint erlaubte nur text/image/voice/system.
-- 'file' (Dateianhang via Share-Sheet) und 'poll' (Umfragen) werden nachgepflegt.

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type = ANY (ARRAY['text', 'image', 'voice', 'system', 'file', 'poll']));
