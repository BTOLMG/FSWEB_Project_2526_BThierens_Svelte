import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	const { data: profile } = await locals.supabase
		.from('gebruiker')
		.select('rol')
		.eq('uid', user.id)
		.single();

	if (!profile || profile.rol !== 'administrator') {
		throw redirect(303, '/login');
	}

	return { user: { email: user.email, rol: profile.rol } };
}