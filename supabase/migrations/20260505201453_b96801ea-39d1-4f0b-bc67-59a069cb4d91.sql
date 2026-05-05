
-- 1) Nova rola superadmin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
