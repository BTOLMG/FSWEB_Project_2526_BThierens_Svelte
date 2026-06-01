import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;

	if (!user) throw redirect(303, '/login');

	const { data: profile } = await locals.supabase
		.from('gebruiker')
		.select('rol, id')
		.eq('uid', user.id)
		.single();

	if (!profile || profile.rol !== 'actorbeheerder') {
		throw redirect(303, '/login');
	}

	return { user: { email: user.email, id: profile.id, rol: profile.rol } };
}