// src/hooks.server.js
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
        event.cookies.set(name, value, { ...options, path: '/' })
      )
    }
  });

  const { data: { user } } = await event.locals.supabase.auth.getUser();
  event.locals.user = user;

  return resolve(event);
}