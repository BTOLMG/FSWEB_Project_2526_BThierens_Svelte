import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });
      const { data: { user } } = await supabase.auth.getUser();

    if (authError || !authData.user || !user) {
      return fail(401, { error: 'Onjuiste inloggegevens.' });
    }

    // console.log('Ingelogde gebruiker:', authData.user);

    const { data: profile } = await supabase
      .from('gebruiker')
      .select('rol')
      .eq('uid', user.id)
      .single();

      // console.log('Gebruikersprofiel:', profile);
      
    if (profile?.rol === 'administrator') {
      throw redirect(303, '/admin');
    } else if (profile?.rol === 'actorbeheerder') {
      throw redirect(303, '/account');
    }

    throw redirect(303, '/');
  }
};