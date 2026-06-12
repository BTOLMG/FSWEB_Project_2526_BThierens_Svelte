import { error } from '@sveltejs/kit';

export async function load({ params, locals: { supabase } }) {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(404, 'Ongeldig ID');
	
	const { data: actor, error: dbError } = await supabase
	
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

	if (dbError || !actor) {
		throw error(404, 'Actor niet gevonden');
	}

	return { actor};
}