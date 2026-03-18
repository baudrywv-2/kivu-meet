-- Fix "Database error saving new user" by avoiding inserts into profiles during auth signup.
-- profiles has NOT NULL fields (name, city) that are filled during onboarding.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Do not create a profiles row here; onboarding creates it with required fields.

  -- Keep legacy preferences row if table exists.
  BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  RETURN NEW;
END;
$function$;

