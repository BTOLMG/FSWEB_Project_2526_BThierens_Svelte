<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';

	import type L from 'leaflet';
	import type {} from 'leaflet.markercluster';	

	let { data }: { data: PageData } = $props();

	let favorieten: number[] = $state([]);

	type Actor = {
		id: number;
		naam: string;
		categorie: string | null;
		straatnaam: string | null;
		huisnummer: string | null;
		busnummer: string | null;
		postcode: string | null;
		gemeente: string | null;
		lat: number;
		lon: number;
	};

	const categorieConfig: Record<string, { kleur: string; icoon: string; badgeClass: string }> = {
		'Vrije tijd': { kleur: 'yellow', icoon: 'fa-star',        badgeClass: 'badge-vrije-tijd' },
		'Gezondheid': { kleur: 'green',  icoon: 'fa-heart-pulse', badgeClass: 'badge-gezondheid' },
	};

	function getCatConfig(cat: string | null): { kleur: string; icoon: string; badgeClass: string } {
		const standaard = { kleur: 'blue', icoon: 'fa-location-dot', badgeClass: '' };
		if (!cat) return standaard;
		return categorieConfig[cat] ?? standaard;
	}

	// svelte-ignore state_referenced_locally
	const alleActoren: Actor[] = data.actoren;

	let gefilterd = $state<Actor[]>(alleActoren);

	let zoekterm         = $state('');
	let gemeenteZoekterm = $state('');
	let actieveCategories= $state(new Set<string>());
	let actieveGemeentes = $state(new Set<string>());

	let radiusKmWaarde   = $state(10);
	let radiusCenter     = $state<{ lat: number; lon: number } | null>(null);
	let radiusCenterNaam = $state<string | null>(null);
	let radiusLabel      = $state('Geen straal actief');
	let radiusInstructie = $state(false);

	let actieveId        = $state<number | null>(null);
	let pickingCenter    = $state(false);

	let accordionOpen    = $state({ straal: true, categorie: false, gemeente: false });

	let map: L.Map | null = null;
	let clusterGroup: L.MarkerClusterGroup | null = null;
	let markers: Record<number, L.Marker> = {};
	let radiusCircle: L.Circle | null = null;
	let radiusCenterMarker: L.Marker | null = null;
	let cardListEl: HTMLDivElement;

	let categorieënCount = $derived(
		alleActoren.reduce<Record<string, number>>((acc, a) => {
			if (a.categorie) acc[a.categorie] = (acc[a.categorie] ?? 0) + 1;
			return acc;
		}, {})
	);

	let gemeentesCount = $derived(
		alleActoren.reduce<Record<string, number>>((acc, a) => {
			if (a.gemeente) acc[a.gemeente] = (acc[a.gemeente] ?? 0) + 1;
			return acc;
		}, {})
	);

	let gefilterdGemeentes = $derived(
		Object.entries(gemeentesCount)
			.sort(([a], [b]) => a.localeCompare(b))
			.filter(([n]) => n.toLowerCase().includes(gemeenteZoekterm.toLowerCase()))
	);

	let chips = $derived([
		...[...actieveCategories].map(c => ({
			label: c,
			cls: '',
			remove: () => {
				const ns = new Set(actieveCategories);
				ns.delete(c);
				actieveCategories = ns;
				update();
			}
		})),
		...[...actieveGemeentes].map(g => ({
			label: g,
			cls: 'chip-gemeente',
			remove: () => {
				const ns = new Set(actieveGemeentes);
				ns.delete(g);
				actieveGemeentes = ns;
				update();
			}
		})),
		...(radiusCenter && radiusKmWaarde
			? [{ label: `${radiusKmWaarde} km straal`, cls: 'chip-radius', remove: clearRadius }]
			: []
		),
	]);

	function formatAdres(a: Actor) {
		const straat = a.straatnaam
			? (a.straatnaam + ' ' + (a.huisnummer ?? '') + (a.busnummer ? ' ' + a.busnummer : '')).trim()
			: null;
		const plaats = a.postcode && a.gemeente
			? a.postcode + ' ' + a.gemeente
			: (a.gemeente ?? null);
		return [straat, plaats].filter(Boolean).join(', ');
	}

	//https://www.geeksforgeeks.org/dsa/haversine-formula-to-find-distance-between-two-points-on-a-sphere/
	function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371;
		const toRad = (d: number) => d * Math.PI / 180;
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);
		const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	function getFavorieten(): number[] {
		try { return JSON.parse(localStorage.getItem('favorieten') ?? '[]'); }
		catch { return []; }
	}

    function saveFavorieten(ids: number[]) {
		localStorage.setItem('favorieten', JSON.stringify(ids));
	}

    function toggleFavoriet(actorId: number) {
		if (favorieten.includes(actorId)) {
			favorieten = favorieten.filter((id) => id !== actorId);
		} else {
			favorieten = [...favorieten, actorId];
		}
		saveFavorieten(favorieten);
	}

	function update() {
		let res = alleActoren;

		if (zoekterm) {
			const z = zoekterm.toLowerCase();
			res = res.filter(a =>
				a.naam?.toLowerCase().includes(z) ||
				a.categorie?.toLowerCase().includes(z) ||
				a.gemeente?.toLowerCase().includes(z)
			);
		}

		if (actieveCategories.size > 0)
			res = res.filter(a => a.categorie && actieveCategories.has(a.categorie));

		if (actieveGemeentes.size > 0)
			res = res.filter(a => a.gemeente && actieveGemeentes.has(a.gemeente));

		if (radiusCenter && radiusKmWaarde) {
			const { lat, lon } = radiusCenter;
			res = res.filter(a => haversineKm(lat, lon, a.lat, a.lon) <= radiusKmWaarde);
		}

		gefilterd = res;
		if (map) renderMarkers(res);
	}

	function toggleCategorie(naam: string) {
		const ns = new Set(actieveCategories);
		if (ns.has(naam)) ns.delete(naam);
		else ns.add(naam);
		actieveCategories = ns;
		update();
	}

	function toggleGemeente(naam: string) {
		const ns = new Set(actieveGemeentes);
		if (ns.has(naam)) ns.delete(naam);
		else ns.add(naam);
		actieveGemeentes = ns;
		update();
	}

	//https://leafletjs.com/reference.html
	//https://stackoverflow.com/questions/49333263/how-to-use-leaflet-markerclustergroup
	//https://github.com/leaflet/leaflet.markercluster
	async function initMap() {	
		const L = (window as unknown as { L: typeof import('leaflet') }).L;

		map = L.map('kaart-map', {
			center: [50.8503463, 4.3517211],
			zoom: 10,
			zoomControl: true,
		});

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		}).addTo(map);

		clusterGroup = L.markerClusterGroup({
			maxClusterRadius: 50,
			spiderfyOnMaxZoom: true,
			showCoverageOnHover: true,
			zoomToBoundsOnClick: true,
			iconCreateFunction(cluster: { getChildCount: () => number }) {
				const count = cluster.getChildCount();
				return L.divIcon({
					html: `<div class="cluster-marker"><span>${count}</span></div>`,
					className: '',
					iconAnchor: [20, 20] as L.PointTuple,
				});
			},
		});
		map!.addLayer(clusterGroup!);

		map.on('click', (e: L.LeafletMouseEvent) => {
			if (!pickingCenter) return;
			pickingCenter = false;
			radiusInstructie = false;
			document.getElementById('kaart-map')?.classList.remove('picking-center');
			setRadiusCenter(e.latlng.lat, e.latlng.lng);
		});

		map.on('popupclose', () => {
			if (actieveId !== null) {
				deactiveerMarkerEl(actieveId);
				actieveId = null;
				gefilterd = [...gefilterd];
			}
		});

		renderMarkers(gefilterd);
	}

	function renderMarkers(actoren: Actor[]) {
		if (!clusterGroup || !map) return;
		clusterGroup.clearLayers();
		markers = {};

		actoren.forEach(actor => {
			const marker = buildMarker(actor);
			markers[actor.id] = marker;
			clusterGroup!.addLayer(marker);
		});
	}

	function buildMarker(actor: Actor): L.Marker {
		const L = (window as unknown as { L: typeof import('leaflet') }).L;
		const cfg = getCatConfig(actor.categorie);
		const adres = formatAdres(actor);

		const icon = L.divIcon({
			html: `<div class="marker ${cfg.kleur}"><i class="fa-solid ${cfg.icoon}"></i></div>`,
			className: '',
			iconSize: [40, 40] as L.PointTuple,
			iconAnchor: [20, 40] as L.PointTuple,
			popupAnchor: [0, -40] as L.PointTuple,
		});

		const marker = L.marker([actor.lat, actor.lon], { icon });

		marker.bindPopup(`
			<div class="popup">
				<span class="popup-badge ${cfg.badgeClass}">${actor.categorie ?? 'Onbekend'}</span>
				<p class="popup-name">${actor.naam}</p>
				${adres ? `<p class="popup-address"><i class="fa fa-location-dot"></i>${adres}</p>` : ''}
				<a href="/details/${actor.id}" class="popup-btn">Details bekijken</a>
			</div>
		`, { maxWidth: 250 });

		marker.on('click', () => activeerActor(actor.id, 'marker'));
		return marker;
	}

	function activeerActor(id: number, bron: 'card' | 'marker') {
		if (actieveId !== null) deactiveerMarkerEl(actieveId);
		actieveId = id;
		gefilterd = [...gefilterd];

		const marker = markers[id];
		if (marker) {
			activeerMarkerEl(marker);
			if (bron === 'card') {
				clusterGroup?.zoomToShowLayer(marker, () => marker.openPopup());
			}
		}

		if (bron === 'marker' && cardListEl) {
			cardListEl.querySelector<HTMLElement>(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

	function activeerMarkerEl(marker: L.Marker) {
		marker.getElement()?.querySelector('.marker')?.classList.add('active');
	}

	function deactiveerMarkerEl(id: number) {
		markers[id]?.getElement()?.querySelector('.marker')?.classList.remove('active');
	}

	function setRadiusCenter(lat: number, lon: number) {
		radiusCenter = { lat, lon };
		radiusCenterNaam = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
		map?.setView([lat, lon], map.getZoom());
		tekenRadiusCircle();
		update();
	}

	function tekenRadiusCircle() {
		if (!radiusCenter || !map) return;
		const L = (window as unknown as { L: typeof import('leaflet') }).L;
		const { lat, lon } = radiusCenter;
		const km = radiusKmWaarde;

		if (radiusCircle) map.removeLayer(radiusCircle);
		if (radiusCenterMarker) map.removeLayer(radiusCenterMarker);

		const blue = getComputedStyle(document.documentElement).getPropertyValue('--primary-blue-color').trim();

		radiusCircle = L.circle([lat, lon], {
			radius: km * 1000,
			color: blue,
			fillColor: blue,
			fillOpacity: 0.07,
			weight: 2,
			dashArray: '6 7',
		}).addTo(map);

		const centerIcon = L.divIcon({
			html: `<div style="width:10px;height:10px;border-radius:50%;background:var(--primary-blue-color);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
			className: '',
		});
		radiusCenterMarker = L.marker([lat, lon], { icon: centerIcon, interactive: false }).addTo(map);

		radiusLabel = `${km} km rond ${radiusCenterNaam ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`}`;
	}

	function clearRadius() {
		radiusCenter = null;
		radiusCenterNaam = null;
		radiusLabel = 'Geen straal actief';

		if (radiusCircle && map) { map.removeLayer(radiusCircle); radiusCircle = null; }
		if (radiusCenterMarker && map) { map.removeLayer(radiusCenterMarker); radiusCenterMarker = null; }

		update();
	}

	function onRadiusSlider(e: Event) {
		radiusKmWaarde = parseInt((e.target as HTMLInputElement).value, 10);
		if (radiusCenter) {
			tekenRadiusCircle();
			update();
		}
	}

	function mijnLocatie() {
		if (!navigator.geolocation) { alert('Geolocatie niet beschikbaar.'); return; }
		navigator.geolocation.getCurrentPosition(
			pos => setRadiusCenter(pos.coords.latitude, pos.coords.longitude),
			() => alert('Kon locatie niet ophalen.'),
			{ timeout: 8000 }
		);
	}

	function klikOpKaart() {
		pickingCenter = !pickingCenter;
		radiusInstructie = pickingCenter;
		document.getElementById('kaart-map')?.classList.toggle('picking-center', pickingCenter);
	}

	// met behulp van AI want anders werkte de map pas na de 2de load
	function loadScript(src: string, integrity?: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[src="${src}"]`)) {
				resolve();
				return;
			}
			const s = document.createElement('script');
			s.src = src;
			s.crossOrigin = 'anonymous';
			if (integrity) s.integrity = integrity;
			s.onload = () => resolve();
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}

	onMount(async () => {
		await loadScript(
			'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
			'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
		);
		await loadScript(
			'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
		);

		initMap();
		favorieten = getFavorieten();
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>

    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>

	<!-- <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
	<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script> -->
</svelte:head>


<div class="layout">
	<!-- ── Sidebar ── -->
	<div class="sidebar">
		<div class="sidebar-header">
			<div class="sidebar-title-row">
				<div>
					<h2 class="sidebar-title">Aanbieders</h2>
					<p class="sidebar-sub">In jouw regio</p>
				</div>
				<span class="result-badge">
					{gefilterd.length}{gefilterd.length === 1 ? ' resultaat' : ' resultaten'}
				</span>
			</div>

			<div class="search-wrapper">
				<i class="fa fa-search search-icon-fa"></i>
				<input
					type="text"
					placeholder="Zoek op naam, gemeente of thema…"
					class="search-input"
					bind:value={zoekterm}
					oninput={() => { setTimeout(update, 200); }}
				/>
			</div>
		</div>

		<!-- Active filter chips -->
		{#if chips.length > 0}
			<div class="active-filters">
				{#each chips as chip (chip.label)}
					<span class="chip {chip.cls}">
						{chip.label}
						<button class="chip-remove" onclick={chip.remove} title="Verwijder filter">
							<i class="fa fa-xmark"></i>
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<!-- Filters -->
		<div class="filters">

			<!-- Straal -->
			<div class="filter-accordion" class:open={accordionOpen.straal}>
				<button type="button" class="filter-accordion-header"
					onclick={() => accordionOpen.straal = !accordionOpen.straal}>
					<span><i class="fa fa-circle-dot"></i> Straal</span>
					<i class="fa fa-chevron-down filter-accordion-icon"></i>
				</button>
				<div class="filter-accordion-body">
					<div class="radius-control">
						<div class="radius-row">
							<span class="radius-label">{radiusLabel}</span>
							{#if radiusCenter}
								<button type="button" class="radius-clear-btn" onclick={clearRadius} title="Straal verwijderen">
									<i class="fa fa-xmark"></i>
								</button>
							{/if}
						</div>
						<input type="range" class="radius-slider" min="1" max="50" step="1"
							value={radiusKmWaarde}
							oninput={onRadiusSlider}
							style="--pct: {((radiusKmWaarde - 1) / 49) * 100}%"
						/>
						<div class="radius-meta">
							<span class="radius-hint">Sleep om radius in te stellen</span>
							<span class="radius-km">{radiusKmWaarde} km</span>
						</div>
						<div class="radius-actions">
							<button type="button" class="radius-btn" onclick={mijnLocatie}>
								<i class="fa fa-location-crosshairs"></i> Mijn locatie
							</button>
							<button type="button" class="radius-btn radius-btn-outline"
								onclick={klikOpKaart}
								style={pickingCenter ? 'opacity:0.6' : ''}>
								<i class="fa fa-map-pin"></i> Klik op kaart
							</button>
						</div>
						{#if radiusInstructie}
							<p class="radius-instruction">
								<i class="fa fa-hand-pointer"></i> Klik ergens op de kaart om het middelpunt te plaatsen.
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Categorie -->
			<div class="filter-accordion" class:open={accordionOpen.categorie}>
				<button type="button" class="filter-accordion-header"
					onclick={() => accordionOpen.categorie = !accordionOpen.categorie}>
					<span><i class="fa fa-tag"></i> Categorie</span>
					<i class="fa fa-chevron-down filter-accordion-icon"></i>
				</button>
				<div class="filter-accordion-body">
					<ul class="filter-checklist">
						{#each Object.entries(categorieënCount).sort() as [naam, count] (naam)}
							{@const checked = actieveCategories.has(naam)}
							<li>
								<label class="filter-check-label" class:checked>
									<input type="checkbox" {checked} onchange={() => toggleCategorie(naam)} />
									<span class="filter-custom-check"></span>
									<span class="filter-check-name">{naam}</span>
									<span class="filter-check-count">{count}</span>
								</label>
							</li>
						{/each}
					</ul>
				</div>
			</div>

			<!-- Gemeente -->
			<div class="filter-accordion" class:open={accordionOpen.gemeente}>
				<button type="button" class="filter-accordion-header"
					onclick={() => accordionOpen.gemeente = !accordionOpen.gemeente}>
					<span><i class="fa fa-map-location-dot"></i> Gemeente</span>
					<i class="fa fa-chevron-down filter-accordion-icon"></i>
				</button>
				<div class="filter-accordion-body">
                    <div class="filter-gemeente-wrapper">
					    <div class="filter-search-wrapper">
						<i class="fa fa-search filter-search-icon"></i>
						<input type="text" class="filter-search-input"
							placeholder="Zoek gemeente…"
							bind:value={gemeenteZoekterm}
						/>
                        </div>
                        <ul class="filter-checklist filter-checklist-scroll">
                            {#each gefilterdGemeentes as [naam, count] (naam)}
                                {@const checked = actieveGemeentes.has(naam)}
                                <li>
                                    <label class="filter-check-label" class:checked>
                                        <input type="checkbox" {checked} onchange={() => toggleGemeente(naam)} />
                                        <span class="filter-custom-check"></span>
                                        <span class="filter-check-name">{naam}</span>
                                        <span class="filter-check-count">{count}</span>
                                    </label>
                                </li>
                            {/each}
                        </ul>
                    </div>
				</div>
			</div>
		</div>

		<!-- Card list -->
		<div class="card-list custom-scroll" bind:this={cardListEl}>
			{#if gefilterd.length === 0}
				<div class="empty">
					<i class="fa fa-search" style="font-size:1.5rem"></i>
					<span>Geen aanbieders gevonden.</span>
				</div>
			{:else}
				{#each gefilterd as actor (actor.id)}
					{@const cfg = getCatConfig(actor.categorie)}
					{@const adres = formatAdres(actor)}
                    {@const isFavoriet = favorieten.includes(actor.id)}
					{@const isActief = actieveId === actor.id}
					<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
					<article
						class="card"
						class:active={isActief}
						data-id={actor.id}
						onclick={() => activeerActor(actor.id, 'card')}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && activeerActor(actor.id, 'card')}
					>
						<div class="card-top">
							<span class="card-badge {cfg.badgeClass}">{actor.categorie ?? 'Onbekend'}</span>
							<button
								class="favoriet-button {isFavoriet ? 'favoriet-actief' : ''}"
								title={isFavoriet ? 'Verwijder uit favorieten' : 'Toevoegen aan favorieten'}
								onclick={() => toggleFavoriet(actor.id)}
							>
								<i class="fa-solid fa-heart"></i>
							</button>
						</div>
						<h3 class="card-name">{actor.naam}</h3>
						{#if adres}
							<p class="card-address">
								<i class="fa fa-location-dot"></i>{adres}
							</p>
						{/if}
						<div class="card-footer">
							<a href="/details/{actor.id}" class="card-details-btn">Details bekijken</a>
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</div>

	<!-- ── Map ── -->
	<section class="map-section">
		<div id="kaart-map"></div>
	</section>
</div>

<style>
	.layout {
		display: flex;
		height: calc(100vh - 60px);
		overflow: hidden;
	}

	:global(.leaflet-top) { z-index: 999 !important; }
	:global(.leaflet-tile) { filter: grayscale(100%) !important; }

	.sidebar {
		width: 380px;
		min-width: 300px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		background-color: var(--primary-white-color);
		border-right: 1px solid var(--secondary-border-blur-color);
		box-shadow: 5px 0 20px rgba(0, 0, 0, 0.1);
		z-index: 10;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1.25rem 1.25rem 1rem;
		border-bottom: 2px solid var(--secondary-border-blur-color);
		flex-shrink: 0;
	}

	.sidebar-title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 0.85rem;
	}

	.sidebar-title {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--primary-blue-color);
		margin: 0 0 0.15rem;
	}

	.sidebar-sub {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--secondary-lightgray-color);
		margin: 0;
	}

	.result-badge {
		font-size: 0.7rem;
		font-weight: 700;
		background-color: var(--primary-lightblue-color);
		color: var(--primary-blue-color);
		border: 1px solid var(--primary-blue-color);
		padding: 0.3rem 0.75rem;
		border-radius: 100px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon-fa {
		position: absolute;
		left: 0.85rem;
		font-size: 0.8rem;
		color: var(--secondary-lightgray-color);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 0.9rem 0.75rem 2.5rem;
		border: 1.5px solid var(--secondary-border-blur-color);
		border-radius: 10px;
		background-color: var(--secondary-broken-white-color);
		font-size: 0.85rem;
		font-family: inherit;
		color: var(--primary-dark-color);
		outline: none;
		transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: var(--primary-blue-color);
		background-color: var(--primary-white-color);
		box-shadow: 0 0 0 3px var(--primary-lightblue-color);
	}

	.active-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		padding: 0.6rem 1.25rem;
		border-bottom: 1px solid var(--secondary-border-blur-color);
		flex-shrink: 0;
		background-color: var(--primary-creme-color);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.25rem 0.55rem 0.25rem 0.7rem;
		border-radius: 100px;
		background-color: var(--primary-lightblue-color);
		color: var(--primary-darkblue-color);
		border: 1px solid var(--primary-blue-color);
		white-space: nowrap;
	}

	.chip-gemeente {
		background-color: var(--secondary-lightyellow-color);
		color: var(--secondary-darkyellow-color);
		border-color: var(--secondary-yellow-color);
	}

	.chip-radius {
		background-color: #dcfce7;
		color: #166534;
		border-color: #86efac;
	}

	.chip-remove {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		font-size: 0.75rem;
		color: inherit;
		opacity: 0.6;
		transition: opacity 0.15s;
	}

	.chip-remove:hover { opacity: 1; }

	.filters {
		border-bottom: 2px solid var(--secondary-border-blur-color);
		flex-shrink: 0;
	}

	.filter-accordion {
		border-bottom: 1px solid var(--secondary-border-blur-color);
	}

	.filter-accordion-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.7rem 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--primary-dark-color);
		font-family: inherit;
		text-align: left;
		transition: all 0.2s;
		gap: 0.5rem;
	}

	.filter-accordion-header:hover {
		color: var(--primary-blue-color);
		background-color: var(--secondary-broken-white-color);
	}

	.filter-accordion-header :global(i) { color: var(--primary-blue-color); }

	.filter-accordion-icon {
		flex-shrink: 0;
		font-size: 0.65rem;
		color: var(--secondary-lightgray-color);
		transition: transform 0.2s;
	}

	.filter-accordion-body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.2s;
		overflow: hidden;
        height: 0;
	}

    .filter-gemeente-wrapper{
        padding: 0 !important;
    }

	.filter-accordion.open .filter-accordion-body { grid-template-rows: 1fr; height: auto;}
	.filter-accordion.open .filter-accordion-icon { transform: rotate(180deg); }
	.filter-accordion-body > * { min-height: 0; overflow: hidden; }

	.filter-accordion-body > div,
	.filter-accordion-body > ul {
		padding: 0 1.25rem 0.75rem;
	}

	.filter-checklist {
		list-style: none;
		margin: 0;
		padding: 0 0.5rem 0.75rem !important;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.filter-checklist-scroll {
		max-height: 180px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--secondary-yellow-color) transparent;
	}

	.filter-checklist li { display: block; }

	.filter-check-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.4rem;
		border-radius: 10px;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--primary-dark-color);
		transition: background-color 0.2s;
	}

	.filter-check-label:hover { background-color: var(--primary-lightblue-color); }

	.filter-check-label input[type='checkbox'] {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.filter-custom-check {
		flex-shrink: 0;
		width: 15px;
		height: 15px;
		border: 1.5px solid var(--secondary-lightgray-color);
		border-radius: 5px;
		background-color: var(--primary-white-color);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.filter-check-label.checked .filter-custom-check {
		background-color: var(--primary-blue-color);
		border-color: var(--primary-blue-color);
	}

	.filter-check-label.checked .filter-custom-check::after {
		content: '';
		display: block;
		width: 10px;
		height: 5px;
		border-left: 2px solid #fff;
		border-bottom: 2px solid #fff;
		transform: rotate(-45deg) translateY(-2px) translateX(1px);
	}

	.filter-check-label.checked {
		color: var(--primary-blue-color);
		font-weight: 700;
	}

	.filter-check-count {
		margin-left: auto;
		font-size: 0.75rem;
		color: var(--secondary-lightgray-color);
		flex-shrink: 0;
	}

	.filter-search-wrapper {
		position: relative;
		margin-bottom: 0.4rem;
		display: flex;
		align-items: center;
        margin: 0 1.25rem 0.75rem;
	}

	.filter-search-icon {
		font-size: 0.7rem;
		color: var(--secondary-lightgray-color);
		pointer-events: none;
		position: absolute;
		left: 0.6rem;
	}

	.filter-search-input {
		width: 100%;
		padding: 0.4rem 0.6rem 0.4rem 1.8rem;
		border: 1.5px solid var(--secondary-border-blur-color);
		border-radius: 10px;
		font-size: 0.8rem;
		color: var(--primary-dark-color);
		background-color: var(--primary-white-color);
		outline: none;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.filter-search-input::placeholder { color: var(--secondary-lightgray-color); }
	.filter-search-input:focus { border-color: var(--primary-blue-color); }

	.radius-control { display: flex; flex-direction: column; gap: 0.5rem; }

	.radius-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.radius-label { font-size: 0.78rem; font-weight: 600; color: var(--secondary-gray-color); }

	.radius-clear-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--primary-red-color);
		font-size: 0.85rem;
		padding: 0.2rem 0.4rem;
		border-radius: 5px;
		transition: background-color 0.2s;
	}

	.radius-clear-btn:hover { background-color: #fee2e2; }

	.radius-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: linear-gradient(
			to right,
			var(--primary-blue-color) var(--pct, 0%),
			var(--secondary-border-blur-color) var(--pct, 0%)
		);
		outline: none;
		cursor: pointer;
	}

	.radius-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--primary-blue-color);
		border: 2px solid #fff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		cursor: pointer;
	}

	.radius-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--primary-blue-color);
		border: 2px solid #fff;
		cursor: pointer;
	}

	.radius-meta { display: flex; justify-content: space-between; align-items: center; }
	.radius-hint { font-size: 0.7rem; color: var(--secondary-lightgray-color); }
	.radius-km { font-size: 0.78rem; font-weight: 700; color: var(--primary-blue-color); }
	.radius-actions { display: flex; gap: 0.5rem; }

	.radius-btn {
		flex: 1;
		padding: 0.5rem 0.6rem;
		border-radius: 8px;
		font-size: 0.7rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s;
		border: 1.5px solid var(--primary-blue-color);
		background-color: var(--primary-blue-color);
		color: var(--primary-white-color);
		white-space: nowrap;
	}

	.radius-btn:hover { background-color: var(--primary-darkblue-color); border-color: var(--primary-darkblue-color); }
	.radius-btn:active { transform: scale(0.95); }

	.radius-btn-outline { background-color: transparent; color: var(--primary-blue-color); }
	.radius-btn-outline:hover { background-color: var(--primary-lightblue-color); }

	.radius-instruction {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--primary-blue-color);
		background-color: var(--primary-lightblue-color);
		border: 1px solid var(--primary-blue-color);
		border-radius: 10px;
		padding: 0.45rem 0.7rem;
		margin: 0;
		text-align: center;
	}

	.card-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.85rem 0.85rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.custom-scroll {
		scrollbar-width: thin;
		scrollbar-color: var(--secondary-yellow-color) transparent;
	}

	.empty {
		text-align: center;
		padding: 2.5rem 1rem;
		color: var(--secondary-lightgray-color);
		font-size: 0.9rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.card {
		background-color: var(--primary-white-color);
		border: 1.5px solid var(--secondary-border-blur-color);
		border-radius: 15px;
		padding: 0.85rem 0.9rem 0.7rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.card:hover {
		border-color: var(--primary-lightblue-color);
		box-shadow: 0 6px 20px var(--primary-lightblue-color);
		transform: translateY(-1px);
	}

	.card.active {
		border-color: var(--primary-blue-color);
		box-shadow: 0 6px 22px var(--primary-lightblue-color);
		background-color: oklch(from var(--primary-blue-color) 0.95 calc(c * 0.1) h);
	}

	.card-top { display: flex; align-items: center; justify-content: space-between; }

	.card-badge {
		font-size: 0.6rem;
		font-weight: 800;
		text-transform: uppercase;
		padding: 0.2rem 0.55rem;
		border-radius: 5px;
		background-color: var(--primary-lightblue-color);
		color: var(--primary-blue-color);
	}

	:global(.badge-vrije-tijd) {
		background-color: var(--secondary-lightyellow-color) !important;
		color: var(--secondary-darkyellow-color) !important;
	}

	:global(.badge-gezondheid) {
		background-color: #dcfce7 !important;
		color: #166534 !important;
	}

	.favoriet-button {
		border: none;
		cursor: pointer;
		font-size: 1rem;
		background-color: transparent;
		color: var(--secondary-lightgray-color);
		transition: all 0.2s;
		padding: 0;
	}

	.favoriet-button.favoriet-actief { color: var(--primary-red-color); }

	.card-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--primary-dark-color);
		margin: 0;
		transition: color 0.2s;
	}

	.card:hover .card-name,
	.card.active .card-name { color: var(--primary-blue-color); }

	.card-address {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: var(--secondary-gray-color);
		margin: 0;
	}

	.card-address :global(i) { color: var(--primary-blue-color); font-size: 0.75rem; }

	.card-footer { margin-top: 0.2rem; }

	.card-details-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0.75rem;
		background-color: var(--secondary-broken-white-color);
		color: var(--primary-dark-color);
		border: none;
		border-radius: 10px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05rem;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.2s;
	}

	.card-details-btn:hover,
	.card.active .card-details-btn {
		background-color: var(--primary-blue-color);
		color: var(--primary-white-color);
	}

	:global(.leaflet-control-zoom) {
		border: none !important;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
		border-radius: 15px !important;
		overflow: hidden;
	}

	:global(.leaflet-control-zoom a) {
		width: 40px !important;
		height: 40px !important;
		line-height: 40px !important;
		font-size: 1rem !important;
		color: var(--primary-dark-color) !important;
		background-color: var(--primary-white-color) !important;
		transition: all 0.2s !important;
	}

	:global(.leaflet-control-zoom a:hover) {
		background-color: var(--secondary-broken-white-color) !important;
		color: var(--primary-blue-color) !important;
	}

	:global(.marker),
	:global(.cluster-marker) {
		width: 30px;
		height: 30px;
		border-radius: 50% 50% 50% 0;
		transform: rotate(-45deg);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2.5px solid var(--primary-white-color);
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		font-size: 1rem;
		color: var(--primary-white-color);
		transition: all 0.2s;
	}

	:global(.marker > *),
	:global(.cluster-marker > *) { transform: rotate(45deg); }

	:global(.cluster-marker) { background-color: #7c7c7cbd; }
	:global(.marker.blue)    { background-color: var(--primary-blue-color); }
	:global(.marker.yellow)  { background-color: #c89a00; }
	:global(.marker.green)   { background-color: #16a34a; }
	:global(.marker.red)     { background-color: var(--primary-red-color); }

	:global(.marker.active) {
		transform: rotate(-45deg) scale(1.25);
		box-shadow: 0 5px 18px rgba(0, 0, 0, 0.25);
	}

	:global(.leaflet-popup-content-wrapper) {
		border-radius: 15px !important;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.14) !important;
		padding: 0 !important;
		border: 1.5px solid var(--secondary-border-blur-color);
		overflow: hidden;
	}

	:global(.leaflet-popup-content) { margin: 0 !important; width: 240px !important; }
	:global(.leaflet-popup-tip) { background: var(--primary-white-color) !important; }
	:global(.popup) { padding: 1rem; }

	:global(.popup-badge) {
		display: inline-block;
		font-size: 0.6rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08rem;
		padding: 0.2rem 0.5rem;
		border-radius: 5px;
		background-color: var(--primary-lightblue-color);
		color: var(--primary-blue-color);
		margin-bottom: 0.5rem;
	}

	:global(.popup-name) { font-weight: 700; color: var(--primary-dark-color); margin: 0 0 0.3rem; }

	:global(.popup-address) {
		font-size: 0.8rem;
		color: var(--secondary-gray-color);
		margin: 0 0 0.7rem;
		display: flex;
		align-items: flex-start;
		gap: 0.3rem;
	}

	:global(.popup-address i) { color: var(--primary-blue-color); margin-top: 2px; flex-shrink: 0; }

	:global(.popup-btn) {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background-color: var(--primary-blue-color);
		color: var(--primary-white-color) !important;
		text-align: center;
		text-decoration: none;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		border-radius: 10px;
		transition: background-color 0.2s;
		cursor: pointer;
	}

	:global(.popup-btn:hover) { background-color: var(--primary-darkblue-color); }

	.map-section { flex: 1; position: relative; overflow: hidden; }

	#kaart-map { width: 100%; height: 100%; cursor: default; }
	:global(#kaart-map.picking-center) { cursor: crosshair !important; }

	@media screen and (max-width: 850px) {
		.layout { flex-direction: column; height: auto; }
		.sidebar { width: 100%; max-height: 80vh; }
		.map-section { height: 30vh; flex: none; }
	}
</style>