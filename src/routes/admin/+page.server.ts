import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Actions } from './$types';

export const actions: Actions = {
	createOrganisatie: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(303, '/login');

		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const passwordConfirm = formData.get('passwordConfirm')?.toString() ?? '';

		if (!email) {
			return fail(400, { error: 'E-mailadres is verplicht.' });
		}
		if (!password || password.length < 8) {
			return fail(400, { error: 'Wachtwoord moet minimaal 8 tekens zijn.' });
		}
		if (password !== passwordConfirm) {
			return fail(400, { error: 'Wachtwoorden komen niet overeen.' });
		}

		const { data: existing } = await locals.supabase
			.from('auth.users')
			.select('email')
			.eq('email', email)
			.single();

		if (existing) {
			return fail(400, { error: 'Dit e-mailadres is al in gebruik.' });
		}

		const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true
		});

		if (authError || !authData.user) {
			return fail(500, { error: 'Fout bij aanmaken: ' + (authError?.message ?? 'Onbekend') });
		}

		const { error: dbError } = await locals.supabase.from('gebruiker').insert({
			uid: authData.user.id,
			created_at: new Date().toISOString(),
			rol: 'actorbeheerder'
		});

		if (dbError) {
			return fail(500, { error: 'Fout bij aanmaken gebruiker: ' + dbError.message });
		}

		return { success: true };
	}
};
