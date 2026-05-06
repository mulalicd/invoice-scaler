UPDATE auth.users 
SET encrypted_password = crypt('Promijeni123!', gen_salt('bf')),
    updated_at = now()
WHERE email = 'direktor@idss.ba';