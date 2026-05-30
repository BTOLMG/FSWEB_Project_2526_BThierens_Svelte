import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: actoren, error } = await locals.supabase
		.from('actor')
		.select(
			`
			id,
			publieke_naam,
			aangeboden_diensten,
			straatnaam,
			huisnummer,
			busnummer,
			postcode,
			gemeente,
			lat,
			lon,
			categorie ( naam ),
			contactgegeven ( type, waarde ),
			openingsuur ( dag_van_de_week, startuur, einduur )
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
			categorie:    (a.categorie as { naam: string }[] | null)?.naam ?? null,
			beschrijving: a.aangeboden_diensten ?? null,
			straatnaam:   a.straatnaam ?? null,
			huisnummer:   a.huisnummer ?? null,
			busnummer:    a.busnummer ?? null,
			postcode:     a.postcode ?? null,
			gemeente:     a.gemeente ?? null,
			lat:          parseFloat(a.lat),
			lon:          parseFloat(a.lon),
			telefoon:     (a.contactgegeven as { type: string; waarde: string }[])?.find((c) => c.type === 'telefoonnr')?.waarde ?? null,
			mail:         (a.contactgegeven as { type: string; waarde: string }[])?.find((c) => c.type === 'mail')?.waarde ?? null,
			website:      (a.contactgegeven as { type: string; waarde: string }[])?.find((c) => c.type === 'online')?.waarde ?? null,
			openingsuren: ((a.openingsuur as { dag_van_de_week: string; startuur: string; einduur: string }[]) ?? []).map((u) => ({
				dag:   u.dag_van_de_week,
				start: u.startuur?.slice(0, 5),
				eind:  u.einduur?.slice(0, 5),
			})),
		}))
	};
};