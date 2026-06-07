import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: actoren, error } = await locals.supabase
		.from('actor')
		.select(
			`
			id,
			publieke_naam,
			straatnaam,
			huisnummer,
			busnummer,
			postcode,
			gemeente,
			lat,
			lon,
			categorie ( naam )
		`
		)
		.not('lat', 'is', null)
		.not('lon', 'is', null)
		.eq('isVisible', true);

	if (error) {
		console.error('Kaart: fout bij ophalen actoren', error);
		return { actoren: [] };
	}

	return {
		actoren: (actoren ?? []).map((a) => ({
			id:           a.id,
			naam:         a.publieke_naam,
			categorie:    (a.categorie as unknown as { naam: string } | null)?.naam ?? null,
			straatnaam:   a.straatnaam ?? null,
			huisnummer:   a.huisnummer ?? null,
			busnummer:    a.busnummer ?? null,
			postcode:     a.postcode ?? null,
			gemeente:     a.gemeente ?? null,
			lat:          parseFloat(a.lat),
			lon:          parseFloat(a.lon),
		}))
	};
};