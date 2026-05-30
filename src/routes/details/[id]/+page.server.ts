import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

	const id = parseInt(params.id);
	if (isNaN(id)) throw error(404, 'Ongeldig ID');
	
	const { data, error: dbError } = await supabase
	
		.from('actor')
		.select(`
			id,
			publieke_naam,
			aangeboden_diensten,
			gemeente,
			postcode,
			straatnaam,
			huisnummer,
			busnummer,
			betaalwijze,
			leeftijdscategorie,
			leeftijd_min,
			leeftijd_max,
			categorie:categorie_id (naam),
			contactgegevens:contactgegeven (type, waarde),
			openingsuren:openingsuur (dag_van_de_week, startuur, einduur, type),
			actor_rubriek (rubriek:rubriek_id (naam))
		`)
		.eq('id', id)
		.single();

	if (dbError || !data) {
		throw error(404, 'Actor niet gevonden');
	}

	const actor = {
		...data,
		categorie: Array.isArray(data.categorie) ? (data.categorie[0] ?? null) : data.categorie
	};

	return { actor };
}