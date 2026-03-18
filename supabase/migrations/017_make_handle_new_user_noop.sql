-- Prevent signup failures: make auth.users trigger a no-op.
-- Onboarding creates profiles and any preference rows after login.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;

