import { error, redirect, fail } from '@sveltejs/kit';

export async function load({ locals, params, parent }) {
	await parent();
	const user = locals.user;

	if (!user) throw redirect(303, '/login');
	
	const { data: gebruiker } = await locals.supabase
		.from('gebruiker')
		.select('id')
		.eq('uid', user.id)
		.single();

	if (!gebruiker) throw redirect(303, '/login');

	const id = parseInt(params.id);
	if (isNaN(id)) throw error(404, 'Ongeldig ID');

	const { data: actor } = await locals.supabase
		.from('actor')
		.select(`
			id, publieke_naam, betaalwijze, leeftijdscategorie, leeftijd_min, leeftijd_max,
			straatnaam, huisnummer, busnummer, gemeente, postcode, lat, lon,
			aangeboden_diensten, opmerkingen, isVisible, last_updated,
			contactpersoon_gebruiker_id,
			categorie:categorie_id (naam),
			contactgegevens:contactgegeven (type, waarde),
			openingsuren:openingsuur (dag_van_de_week, startuur, einduur),
			actor_rubriek (rubriek_id)
		`)
		.eq('id', id)
		.single();

	if (!actor) throw error(404, 'Actor niet gevonden');

	if (actor.contactpersoon_gebruiker_id !== gebruiker.id) {
		throw error(403, 'Geen toegang tot deze actor');
	}

	const { data: alleRubrieken } = await locals.supabase
		.from('rubriek')
		.select('id, naam, level')
		.order('level')
		.order('naam');

	return {
		actor: actor,
		alleRubrieken: alleRubrieken ?? [],
		gekoppeldeIds: actor.actor_rubriek.map((ar: { rubriek_id: string }) => ar.rubriek_id),
		user: { email: user.email, id: gebruiker.id }
	};
}

export const actions = {
	saveActor: async ({ request, locals, params }) => {
		const user = locals.user;

		if (!user) throw redirect(303, '/login');

		const { data: gebruiker } = await locals.supabase
			.from('gebruiker')
			.select('id')
			.eq('uid', user.id)
			.single();

		if (!gebruiker) throw redirect(303, '/login');

		const id = parseInt(params.id);

		if (isNaN(id)) return fail(400, { error: 'Ongeldig ID' });

		const { data: actor, error: actorCheckErr } = await locals.supabase
			.from('actor')
			.select('id, contactpersoon_gebruiker_id')
			.eq('id', id)
			.single();


		if (!actor || actor.contactpersoon_gebruiker_id !== gebruiker.id) {
			return fail(403, { error: 'Geen toegang tot deze actor' });
		}

		const formData = await request.formData();
		const publieke_naam = formData.get('publieke_naam');
		const betaalwijze = formData.get('betaalwijze');
		const leeftijdscategorie = formData.get('leeftijdscategorie');
		const leeftijd_min = formData.get('leeftijd_min');
		const leeftijd_max = formData.get('leeftijd_max');
		const straatnaam = formData.get('straatnaam');
		const huisnummer = formData.get('huisnummer');
		const busnummer = formData.get('busnummer');
		const gemeente = formData.get('gemeente');
		const postcode = formData.get('postcode');
		const lat = formData.get('lat');
		const lon = formData.get('lon');
		const aangeboden_diensten = formData.get('aangeboden_diensten');
		const opmerkingen = formData.get('opmerkingen');
		const isVisible = formData.get('isVisible') === 'on';
		const telefoonnr = formData.get('telefoonnr');
		const mail = formData.get('mail');
		const website = formData.get('website');
		const rubriekenValue = formData.get('rubrieken');
		const rubrieken = typeof rubriekenValue === 'string' ? JSON.parse(rubriekenValue) : [];


		if (typeof publieke_naam !== 'string' || !publieke_naam.trim()) {
			return fail(400, { error: 'Naam is verplicht.' });
		}

		const updatePayload = {
			publieke_naam: (publieke_naam as string).trim(),
			betaalwijze: betaalwijze || null,
			leeftijdscategorie: leeftijdscategorie || null,
			leeftijd_min: leeftijd_min ? parseInt(leeftijd_min as string) : null,
			leeftijd_max: leeftijd_max ? parseInt(leeftijd_max as string) : null,
			straatnaam: straatnaam || null,
			huisnummer: huisnummer || null,
			busnummer: busnummer || null,
			gemeente: gemeente || null,
			postcode: postcode || null,
			lat: lat ? parseFloat(lat as string) : null,
			lon: lon ? parseFloat(lon as string) : null,
			aangeboden_diensten: aangeboden_diensten || null,
			opmerkingen: opmerkingen || null,
			isVisible,
			last_updated: new Date().toISOString().slice(0, 10)
		};
		
		const { data: updateData, error: actorErr } = await locals.supabase
			.from('actor')
			.update(updatePayload)
			.eq('id', id)
			.select();

		if (actorErr) {
			return fail(400, { error: `Update failed: ${actorErr.message}` });
		}

		for (const [type, waarde] of [
			['telefoonnr', telefoonnr],
			['mail', mail],
			['online', website]
		]) {
			const { data: existing, error: selectErr } = await locals.supabase
				.from('contactgegeven')
				.select('id')
				.eq('actor_id', id)
				.eq('type', type)
				.maybeSingle();

			if (waarde) {
				if (existing) {
					const { error: updateErr } = await locals.supabase
						.from('contactgegeven')
						.update({ waarde })
						.eq('actor_id', id)
						.eq('type', type);
					if (updateErr) console.error(`Contactgegeven ${type} update error:`, updateErr);
				} else {
					const { error: insertErr } = await locals.supabase
						.from('contactgegeven')
						.insert({ actor_id: id, type, waarde });
					if (insertErr) console.error(`Contactgegeven ${type} insert error:`, insertErr);
				}
			} else if (existing) {
				const { error: deleteErr } = await locals.supabase
					.from('contactgegeven')
					.delete()
					.eq('actor_id', id)
					.eq('type', type);
				if (deleteErr) console.error(`Contactgegeven ${type} delete error:`, deleteErr);
			}
		}

		await locals.supabase.from('actor_rubriek').delete().eq('actor_id', id);
		if (rubrieken.length > 0) {
			await locals.supabase
				.from('actor_rubriek')
				.insert(rubrieken.map((rubriek_id: string) => ({ actor_id: id, rubriek_id })));
		}

		const openingsuurValue = formData.get('openingsuren');
		const openingsuren = typeof openingsuurValue === 'string' ? JSON.parse(openingsuurValue) : [];

		await locals.supabase.from('openingsuur').delete().eq('actor_id', id);
		if (openingsuren.length > 0) {
			const { error: openingsuurErr } = await locals.supabase
				.from('openingsuur')
				.insert(
					openingsuren.map((u: { dag_van_de_week: string; startuur: string; einduur: string }) => ({
						actor_id: id,
						dag_van_de_week: u.dag_van_de_week,
						startuur: u.startuur,
						einduur: u.einduur,
						type: 'open'
					}))
				);
			if (openingsuurErr) console.error('Openingsuur insert error:', openingsuurErr);
		}

		return { success: true };
	}
};