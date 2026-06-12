import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

function gemeenteLabel(actor : { postcode?: string; gemeente?: string }) {
	return `${actor.postcode ?? ''} ${actor.gemeente ?? ''}`.trim();
}

export async function load({ url }) {
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

	const searchTerm = url.searchParams.get('zoekterm') ?? '';
	const selectedGemeentes = url.searchParams.getAll('gemeentes[]');
	const selectedRubrieken = url.searchParams.getAll('rubrieken[]');

	let query = supabase.from('actor').select(
		`
		id,
		publieke_naam,
		aangeboden_diensten,
		gemeente,
		postcode,
		straatnaam,
		huisnummer,
		busnummer,
		categorie:categorie_id (naam),
		contactgegevens:contactgegeven (type, waarde),
		openingsuren:openingsuur (dag_van_de_week, startuur, einduur),
		actor_rubriek (rubriek:rubriek_id (naam)) 
		`
	).eq('isVisible', true);

	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		query = query.or(
			`publieke_naam.ilike.%${term}%,` +
			`aangeboden_diensten.ilike.%${term}%,` +
			`gemeente.ilike.%${term}%`
		);
	}

	const { data: raw } = await query;

	if (!raw) {
		return {
			searchTerm,
			results: [],
			gemeenteAccordionItems: {},
			rubriekAccordionItems: {},
			meta: { selectedGemeentes, selectedRubrieken }
		};
	}

	const gefilterd = raw.filter((actor) => {
		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			const matchesRubriek = actor.actor_rubriek.some(({ rubriek }) =>
				rubriek.naam.toLowerCase().includes(term)
			);
			const matchesMain =
				actor.publieke_naam?.toLowerCase().includes(term) ||
				actor.aangeboden_diensten?.toLowerCase().includes(term) ||
				actor.gemeente?.toLowerCase().includes(term);

			if (!matchesMain && !matchesRubriek) return false;
		}

		if (selectedGemeentes.length > 0 && !selectedGemeentes.includes(gemeenteLabel(actor))) {
			return false;
		}

		if (
			selectedRubrieken.length > 0 &&
			!actor.actor_rubriek.some(({ rubriek }) => selectedRubrieken.includes(rubriek.naam))
		) {
			return false;
		}

		return true;
	});

	const tellingPerGemeente: Record<string, number> = {};
	for (const actor of gefilterd) {
		if (actor.gemeente) {
			const label = gemeenteLabel(actor);
			tellingPerGemeente[label] = (tellingPerGemeente[label] ?? 0) + 1;
		}
	}

	const gemeenteAccordionItems: Record<string, number> = {};
	const rawGemeentes = Array.from(new Set(raw.filter((a) => a.gemeente).map(gemeenteLabel))).sort();
	for (const label of rawGemeentes) {
		gemeenteAccordionItems[label] = tellingPerGemeente[label] ?? 0;
	}

	const tellingPerRubriek: Record<string, number> = {};
	for (const actor of gefilterd) {
		for (const { rubriek } of actor.actor_rubriek) {
			tellingPerRubriek[rubriek.naam] = (tellingPerRubriek[rubriek.naam] ?? 0) + 1;
		}
	}

	const rawRubriekenSet = new Set<string>();
	for (const actor of raw) {
		for (const { rubriek } of actor.actor_rubriek) {
			rawRubriekenSet.add(rubriek.naam);
		}
	}
	const rawRubrieken = Array.from(rawRubriekenSet);

	const rubriekEntries = rawRubrieken.map((naam): [string, number] => [naam, tellingPerRubriek[naam] ?? 0]);
	rubriekEntries.sort((a, b) => b[1] - a[1]);

	const rubriekAccordionItems: Record<string, number> = {};
	for (const [naam, count] of rubriekEntries) {
		rubriekAccordionItems[naam] = count;
	}

	return {
		searchTerm,
		results: gefilterd,
		gemeenteAccordionItems,
		rubriekAccordionItems,
		meta: { selectedGemeentes, selectedRubrieken }
	};
}