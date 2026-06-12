import { fail, redirect } from '@sveltejs/kit';

export async function load({ locals, parent }) {
	await parent();
	const user = locals.user;

	if (!user) throw redirect(303, '/login');

	const { data: gebruiker } = await locals.supabase
		.from('gebruiker')
		.select('id')
		.eq('uid', user.id)
		.single();

	if (!gebruiker) throw redirect(303, '/login');

	const { data: actoren } = await locals.supabase
		.from('actor')
		.select('id, publieke_naam, gemeente, isVisible, last_updated, categorie:categorie_id(naam)')
		.eq('contactpersoon_gebruiker_id', gebruiker.id)
		.order('publieke_naam');

	const { data: categorieen } = await locals.supabase
		.from('categorie')
		.select('id, naam')
		.order('naam');

	return {
		actoren: actoren ?? [],
		categorieen: categorieen ?? [],
		gebruikerId: gebruiker.id
	};
}
export const actions = {
	createActor: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(303, '/login');

		const { data: gebruiker } = await locals.supabase
			.from('gebruiker')
			.select('id')
			.eq('uid', user.id)
			.single();

		if (!gebruiker) return fail(400, { error: 'Gebruiker niet gevonden' });

		const formData = await request.formData();
		const publieke_naam = formData.get('publieke_naam')?.toString().trim();
		const categorie_id = parseInt(formData.get('categorie_id')?.toString() ?? '');

		if (!publieke_naam || !categorie_id) {
			return fail(400, { error: 'Naam en categorie zijn verplicht' });
		}

		const { error } = await locals.supabase.from('actor').insert({
			publieke_naam,
			categorie_id,
			contactpersoon_gebruiker_id: gebruiker.id,
			isVisible: false
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteActor: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(303, '/login');

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');

		if (!id) return fail(400, { error: 'Ongeldig actor ID' });

		const { error } = await locals.supabase.from('actor').delete().eq('id', id);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};