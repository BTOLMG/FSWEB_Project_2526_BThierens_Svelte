import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';

const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function load({ locals, parent }) {
	await parent();

	const { data: actorenRaw } = await locals.supabase
		.from('actor')
		.select('id, publieke_naam, gemeente, isVisible, categorie:categorie_id(naam), contactpersoon:contactpersoon_gebruiker_id(id, uid)')
		.order('publieke_naam');

	const { data: usersRaw } = await locals.supabase
		.from('gebruiker')
		.select('id, rol, actor_id, uid')
		.neq('rol', 'administrator')
		.order('id');

	const allUids = new Set<string>();

	for (const actor of actorenRaw ?? []) {
		const contactpersonen = Array.isArray(actor.contactpersoon)
			? actor.contactpersoon
			: actor.contactpersoon
			? [actor.contactpersoon]
			: [];

		for (const contactpersoon of contactpersonen) {
			if (contactpersoon.uid) allUids.add(contactpersoon.uid);
		}
	}

	for (const user of usersRaw ?? []) {
		if (user.uid) allUids.add(user.uid);
	}

	let authUsersMap = new Map<string, string>();
	if (allUids.size > 0) {
		try {
			const { data, error } = await adminClient.auth.admin.listUsers();
			if (error) {
				console.error('Error ophalen auth users:', error);
			} else {
				for (const u of data?.users ?? []) {
					if (allUids.has(u.id)) {
						authUsersMap.set(u.id, u.email?.toString() ?? '');
					}
				}
			}
		} catch (err) {
			console.error('Error ophalen auth admin:', err);
		}
	}

	const actoren = (actorenRaw ?? []).map((a: any) => ({
		id: a.id,
		naam: a.publieke_naam,
		categorie: Array.isArray(a.categorie) ? (a.categorie[0]?.naam ?? '-') : (a.categorie?.naam ?? '-'),
		gemeente: a.gemeente ?? '-',
		isVisible: a.isVisible,
		beheerder: Array.isArray(a.contactpersoon)
			? (a.contactpersoon[0] ? authUsersMap.get(a.contactpersoon[0].uid) ?? null : null)
			: (a.contactpersoon ? authUsersMap.get(a.contactpersoon.uid) ?? null : null)
	}));

	const { data: actorUsers } = await locals.supabase
		.from('actor')
		.select('contactpersoon_gebruiker_id, publieke_naam');

	const users = (usersRaw ?? []).map((u: any) => ({
		id: u.id,
		email: authUsersMap.get(u.uid) ?? '',
		rol: u.rol,
		actoren: (actorUsers ?? [])
			.filter((a: any) => a.contactpersoon_gebruiker_id === u.id)
			.map((a: any) => a.publieke_naam)
			.join(', ') || '-'
	}));

	return { actoren, users };
}

export const actions = {
	deleteUser: async ({ request, locals }) => {
		const formData = await request.formData();
		const gebruikerId = Number(formData.get('id'));

		const { data: gebruiker, error } = await locals.supabase
			.from('gebruiker')
			.select('uid')
			.eq('id', gebruikerId)
			.single();

		if (error || !gebruiker) {
			return fail(404, { message: 'Gebruiker niet gevonden' });
		}

		await locals.supabase
			.from('actor')
			.delete()
			.eq('contactpersoon_gebruiker_id', gebruikerId);

		await locals.supabase
			.from('gebruiker')
			.delete()
			.eq('id', gebruikerId);

		const { error: authError } =
			await adminClient.auth.admin.deleteUser(gebruiker.uid);

		if (authError) {
			console.error('Error ophalen auth admin:', authError);
			return fail(500, { message: authError.message });
		}

		return { statusMsg: "Organisatie succesvol verwijderd." };
	},

	deleteActor: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const naam = formData.get('naam') as string;

		const { error } = await locals.supabase
			.from('actor')
			.delete()
			.eq('id', id);

		if (error) {
			return fail(500, { message: 'Fout bij verwijderen: ' + error.message });
		}

		return { statusMsg: `Actor "${naam}" verwijderd.` };
	}
};