
-- Dozvoli svim prijavljenim korisnicima da vide osnovni popis organizacija (za onboarding)
CREATE POLICY "Authenticated can list organizations" ON public.organizations
  FOR SELECT TO authenticated USING (true);

-- Dropuj prethodnu restriktivnu select policy (sad je uključena u gornju)
DROP POLICY IF EXISTS "Users see own organization" ON public.organizations;
