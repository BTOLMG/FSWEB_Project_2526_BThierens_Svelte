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

	const contactPersonUids = (actorenRaw ?? [])
		.flatMap((a: any) => Array.isArray(a.contactpersoon) ? a.contactpersoon.map((cp: any) => cp.uid) : (a.contactpersoon?.uid ? [a.contactpersoon.uid] : []))
		.filter((uid: any) => uid);

	const userUids = (usersRaw ?? []).map((u: any) => u.uid).filter(Boolean);
	const allUids = [...new Set([...contactPersonUids, ...userUids])];

	let authUsersMap = new Map();
	if (allUids.length > 0) {
		try {
			const { data, error } = await adminClient.auth.admin.listUsers();
			if (error) {
				console.error('Error fetching auth users:', error);
			} else {
				authUsersMap = new Map(
					(data?.users ?? [])
						.filter((u: any) => allUids.includes(u.id))
						.map((u: any) => [u.id, u.email])
				);
			}
		} catch (err) {
			console.error('Error accessing auth admin:', err);
		}
	}

	const authUsersMapForUsers = authUsersMap;

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
		email: authUsersMapForUsers.get(u.uid) ?? '',
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
			console.error(authError);
			return fail(500, { message: authError.message });
		}

		return { statusMsg: "Organisatie succesvol verwijderd." };
	}
};
