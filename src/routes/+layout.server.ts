import type { LayoutServerLoad } from './$types';

export async function load({ locals }) {
  const user = locals.user;

  if (!user) return { user: null };

  const { data: profile } = await locals.supabase
    .from('gebruiker')
    .select('rol')
    .eq('uid', user.id)
    .single();

  return {
    user: {
      email: user.email,
      rol: profile?.rol ?? null
    }
  };
}