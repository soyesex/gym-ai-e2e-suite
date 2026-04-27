// src/helpers/auth.helper.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export async function loginAndSaveState(
  email: string,
  password: string,
  storageStatePath: string
): Promise<void> {
  // 1. Cliente con anon key
  const supabase = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY , {
    auth: { persistSession: false }
  });

  // 2. Login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);

  // 3. Extraer tokens
  const session = data.session!;

  // 4. Construir el storageState
  //    - El "project ref" para local lo sacás del hostname de SUPABASE_URL
  const ref = new URL(env.SUPABASE_URL).hostname
  //    - Cookie name: `sb-<ref>-auth-token.0`
  //    - Cookie value: el JSON de la session (stringified)
  //    - localStorage key: `sb-<ref>-auth-token`
  //    - origin: tu BASE_URL (http://localhost:3000)

  const storageState = {
    cookies: [{
        name: `sb-${ref}-auth-token.0`,
        value: JSON.stringify(session),
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 3600,
    }],
    origins: [{
      origin: 'http://localhost:3000',
      localStorage: [{
        name: `sb-${ref}-auth-token`,
        value: JSON.stringify(session)
      }],
    }],
  };

  // 5. Escribir a disco
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
  fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2));
}