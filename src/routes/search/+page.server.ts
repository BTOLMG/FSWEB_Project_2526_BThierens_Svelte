import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

// Met AI want wist niet wat een goede manier was om de data uit supabase naar bruikbare data te krijgen
interface ActorRaw {
	id: number;
	publieke_naam: string;
	aangeboden_diensten: string;
	gemeente: string;
	postcode: string;
	straatnaam: string;
	huisnummer: string;
	busnummer: string;
	categorie: { naam: string }[] | { naam: string } | null;
	contactgegevens: Array<{ type: string; waarde: string }>;
	openingsuren: Array<{ dag_van_de_week: string; startuur: string; einduur: string }>;
	actor_rubriek: Array<{ rubriek: { naam: string } }>;
}

interface Actor {
	id: number;
	publieke_naam: string;
	aangeboden_diensten: string;
	gemeente: string;
	postcode: string;
	straatnaam: string;
	huisnummer: string;
	busnummer: string;
	categorie: { naam: string } | null;
	contactgegevens: Array<{ type: string; waarde: string }>;
	openingsuren: Array<{ dag_van_de_week: string; startuur: string; einduur: string }>;
	actor_rubriek: Array<{ rubriek: { naam: string } }>;
}

function mapActor(raw: ActorRaw): Actor {
	return {
		...raw,
		categorie: Array.isArray(raw.categorie) ? (raw.categorie[0] ?? null) : raw.categorie
	};
}

export async function load({ url }) {
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

	const searchTerm = url.searchParams.get('zoekterm') || '';
	const selectedGemeentes = url.searchParams.getAll('gemeentes[]');
	const selectedRubrieken = url.searchParams.getAll('rubrieken[]');

	const selectFields = `
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
	`;

	let baseQuery = supabase.from('actor').select(selectFields).eq('isVisible', true);

	if (searchTerm) {
		baseQuery = baseQuery.or(
			`publieke_naam.ilike.%${searchTerm}%,` +
			`aangeboden_diensten.ilike.%${searchTerm}%,` +
			`gemeente.ilike.%${searchTerm}%`
		);
	}

	const { data: alleActorenRaw } = await baseQuery;
	let alle = ((alleActorenRaw ?? []) as unknown as ActorRaw[]).map(mapActor);

	if (searchTerm) {
		const term = searchTerm.toLowerCase();

		const alleIds = new Set(alle.map((a) => a.id));
		const { data: rubriekMatchRaw } = await supabase
			.from('actor')
			.select(selectFields)
			.eq('isVisible', true);

		const rubriekMatches = ((rubriekMatchRaw ?? []) as unknown as ActorRaw[])
			.map(mapActor)
			.filter(
				(a) =>
					!alleIds.has(a.id) &&
					a.actor_rubriek.some(({ rubriek }) => rubriek.naam.toLowerCase().includes(term))
			);

		alle = [...alle, ...rubriekMatches];
	}

	let gefilterd = alle;

	if (selectedGemeentes.length > 0) {
		gefilterd = gefilterd.filter((a) => {
			const label = `${a.postcode ?? ''} ${a.gemeente ?? ''}`.trim();
			return selectedGemeentes.includes(label);
		});
	}

	if (selectedRubrieken.length > 0) {
		gefilterd = gefilterd.filter((a) =>
			a.actor_rubriek.some(({ rubriek }) => selectedRubrieken.includes(rubriek.naam))
		);
	}

	const gemeenteLabel = (a: Actor) => `${a.postcode ?? ''} ${a.gemeente ?? ''}`.trim();

	const tellingPerGemeente: Record<string, number> = {};
	gefilterd.forEach((a) => {
		if (a.gemeente) {
			const label = gemeenteLabel(a);
			tellingPerGemeente[label] = (tellingPerGemeente[label] ?? 0) + 1;
		}
	});

	//https://stackoverflow.com/questions/33089695/how-can-i-sort-an-es6-set
	// -> zet een set om naar een array
	const gemeenteAccordionItems: Record<string, number> = {};
	[...new Set(alle.filter((a) => a.gemeente).map(gemeenteLabel))]
		.sort()
		.forEach((label) => {
			gemeenteAccordionItems[label] = tellingPerGemeente[label] ?? 0;
		});

	const tellingPerRubriek: Record<string, number> = {};
	gefilterd.forEach((a) =>
		a.actor_rubriek.forEach(({ rubriek }) => {
			tellingPerRubriek[rubriek.naam] = (tellingPerRubriek[rubriek.naam] ?? 0) + 1;
		})
	);

	const alleRubrieken = [
		...new Set(alle.flatMap((a) => a.actor_rubriek.map(({ rubriek }) => rubriek.naam)))
	];

	const rubriekAccordionItems: Record<string, number> = Object.fromEntries(
		alleRubrieken
			.map((naam) => [naam, tellingPerRubriek[naam] ?? 0] as [string, number])
			.sort((a, b) => b[1] - a[1])
	);

	return {
		searchTerm,
		results: gefilterd,
		gemeenteAccordionItems,
		rubriekAccordionItems,
		meta: {
			selectedGemeentes,
			selectedRubrieken
		}
	};
}