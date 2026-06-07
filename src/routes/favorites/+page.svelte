<script lang="ts">
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

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
	}

	let favorieten: number[] = $state([]);
	let actoren: Actor[] = $state([]);
	let loading = $state(true);

	function getFavorieten(): number[] {
		try {
			return JSON.parse(localStorage.getItem('favorieten') || '[]');
		} catch {
			return [];
		}
	}

	function saveFavorieten(ids: number[]) {
		localStorage.setItem('favorieten', JSON.stringify(ids));
	}

	function removeFavoriet(id: number) {
		favorieten = favorieten.filter((f) => f !== id);
		actoren = actoren.filter((a) => a.id !== id);
		saveFavorieten(favorieten);
	}

	onMount(async () => {
		favorieten = getFavorieten();

		if (favorieten.length === 0) {
			loading = false;
			return;
		}

		const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

		const { data } = await supabase
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
				categorie:categorie_id (naam),
				contactgegevens:contactgegeven (type, waarde)
			`)
			.in('id', favorieten);

		actoren = ((data ?? []) as unknown as Actor[]).map((a) => ({
			...a,
			categorie: Array.isArray(a.categorie) ? (a.categorie[0] ?? null) : a.categorie
		}));

		loading = false;
	});

	function getContactWaarde(actor: Actor, type: string) {
		return actor.contactgegevens?.find((c) => c.type === type)?.waarde;
	}
</script>

<div class="fav-page">
	<div class="fav-header">
		<div class="fav-header-inner">
			<h1>Mijn bewaarde&ensp;<span class="blue-italic">Hulp & Zorg</span></h1>
			<p class="fav-subtitle">
				Hier vind je de diensten die je hebt opgeslagen. Een handig overzicht van de hulp en zorg
				die je belangrijk vindt.
			</p>
		</div>
	</div>

	<div class="favorieten-container">
		{#if loading}
			<p class="fav-state-msg">Laden...</p>
		{:else if actoren.length === 0}
			<div class="fav-empty">
				<i class="fa fa-heart-crack fav-empty-icon"></i>
				<p class="fav-empty-title">Nog geen favorieten opgeslagen</p>
				<p class="fav-empty-sub">Zoek diensten en sla ze op via het hartje op de zoekpagina.</p>
				<a href="/search" class="fav-empty-link">Ga naar zoeken</a>
			</div>
		{:else}
			{#each actoren as actor (actor.id)}
				{@const telefoon = getContactWaarde(actor, 'telefoonnr')}
				{@const mail = getContactWaarde(actor, 'mail')}
				{@const website = getContactWaarde(actor, 'online')}
				{@const adres = [
					[actor.straatnaam, actor.huisnummer, actor.busnummer].filter(Boolean).join(' '),
					[actor.postcode, actor.gemeente].filter(Boolean).join(' ')
				]
					.filter(Boolean)
					.join(', ')}

				<div class="fav-card">
					<div class="fav-card-top">
						{#if actor.categorie}
							<span class="fav-card-badge">{actor.categorie.naam}</span>
						{/if}
						<button
							class="favoriet-button"
							title="Verwijder uit favorieten"
							type="button"
							onclick={(e) => {
								removeFavoriet(actor.id);
							}}
						>
							<i class="fa fa-heart"></i>
						</button>
					</div>

					<div class="fav-card-body">
						<h2>{actor.publieke_naam}</h2>
						{#if actor.aangeboden_diensten}
							<p>{actor.aangeboden_diensten}</p>
						{/if}
					</div>

					<div class="fav-card-footer">
						{#if adres}
							<span class="fav-card-meta">
								<i class="fa fa-map-marker-alt"></i>
								{adres}
							</span>
						{/if}
						{#if telefoon}
							<span class="fav-card-meta">
								<i class="fa fa-phone"></i>
								<a href="tel:{telefoon}">{telefoon}</a>
							</span>
						{/if}
						{#if mail}
							<span class="fav-card-meta">
								<i class="fa fa-envelope"></i>
								<a href="mailto:{mail}">{mail}</a>
							</span>
						{/if}
						{#if website}
							<span class="fav-card-meta">
								<i class="fa fa-globe"></i>
								<a href={website} target="_blank" rel="noopener">{website}</a>
							</span>
						{/if}
					</div>

					<a href="/details/{actor.id}" class="fav-card-link">Bekijk details</a>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.fav-page {
		min-height: 80vh;
	}

	.fav-header {
		padding: 3rem 10vw 2rem;
	}

	.fav-header-inner {
		max-width: 60vw;
	}

	h1 {
		font-weight: 700;
		letter-spacing: -1px;
		font-size: 4rem;
		margin-bottom: 0;
	}

	.blue-italic {
		color: var(--primary-blue-color);
		font-style: italic;
	}

	.fav-subtitle {
		font-size: 1.25rem;
		color: var(--secondary-blue-text-color);
		margin-top: 0.5rem;
	}

	.favorieten-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
		margin: 2rem 10vw 5rem;
	}

	.fav-state-msg {
		grid-column: 1 / -1;
		color: var(--secondary-lightgray-color);
		font-size: 1rem;
	}

	/* Empty state */
	.fav-empty {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 4rem 2rem;
		text-align: center;
	}

	.fav-empty-icon {
		font-size: 3rem;
		color: var(--secondary-lightgray-color);
		margin-bottom: 0.5rem;
	}

	.fav-empty-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--secondary-gray-color);
		margin: 0;
	}

	.fav-empty-sub {
		font-size: 0.9rem;
		color: var(--secondary-lightgray-color);
		margin: 0;
	}

	.fav-empty-link {
		margin-top: 1rem;
		background-color: var(--primary-blue-color);
		color: var(--primary-white-color);
		font-weight: 700;
		text-decoration: none;
		border-radius: 20px;
		padding: 8px 20px;
		transition: background-color 0.2s;
	}

	.fav-empty-link:hover {
		background-color: var(--primary-darkblue-color);
	}

	/* Card */
	.fav-card {
		background-color: var(--primary-white-color);
		border-radius: 1rem;
		padding: 1.25rem;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.fav-card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.fav-card-badge {
		background-color: var(--secondary-yellow-color);
		color: var(--secondary-gray-color);
		font-weight: 700;
		font-size: 0.75rem;
		padding: 4px 12px;
		border-radius: 20px;
	}

	.fav-card-body h2 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
		color: var(--primary-dark-color);
	}

	.fav-card-body p {
		font-size: 0.9rem;
		color: var(--secondary-blue-text-color);
		margin: 0;
	}

	.fav-card-footer {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: auto;
		padding-top: 0.5rem;
		border-top: 1px solid var(--secondary-border-blur-color);
	}

	.fav-card-meta {
		font-size: 0.85rem;
		color: var(--secondary-blue-text-color);
		display: flex;
		align-items: center;
		gap: 0.35rem;
		word-break: break-word;
	}

	.fav-card-meta i {
		color: var(--primary-blue-color);
		flex-shrink: 0;
	}

	.fav-card-meta a {
		color: inherit;
		text-decoration: none;
	}

	.fav-card-meta a:hover {
		color: var(--primary-blue-color);
	}

	.favoriet-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		color: var(--primary-red-color);
		transition: all 0.3s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.favoriet-button:hover {
		transform: translateY(-2px);
		color: oklch(from var(--primary-red-color) calc(l * 0.75) c h);
	}

	.fav-card-link {
		text-decoration: none;
		background-color: var(--primary-blue-color);
		color: var(--primary-white-color);
		font-weight: 700;
		font-size: 0.9rem;
		padding: 6px 14px;
		border-radius: 20px;
		width: fit-content;
		transition: all 0.3s;
	}

	.fav-card-link:hover {
		transform: translateY(-2px);
		background-color: oklch(from var(--primary-blue-color) calc(l * 0.95) c h);
	}

	@media screen and (max-width: 755px) {
		.fav-header {
			padding: 2rem 5vw 1rem;
		}

		.fav-header-inner {
			max-width: 100%;
		}

		h1 {
			font-size: 2.5rem;
			text-wrap: balance;
		}

		.fav-subtitle {
			font-size: 1rem;
			text-wrap: balance;
		}

		.favorieten-container {
			margin: 1.5rem 5vw 3rem;
		}
	}
</style>