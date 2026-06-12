<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();
	// svelte-ignore state_referenced_locally
	const actor = data.actor;

	const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

	function getUur(dag: string) {
		return actor.openingsuren?.find((u: { dag_van_de_week: string }) => u.dag_van_de_week === dag);
	}

	function isOpen(dag: string) {
		const uur = getUur(dag);
		return uur;
	}

	function contactIcon(type: string) {
		if (type === 'telefoonnr') return 'fa-phone';
		if (type === 'mail') return 'fa-envelope';
		if (type === 'online') return 'fa-globe';
		return 'fa-info-circle';
	}

	function contactLabel(type: string) {
		if (type === 'telefoonnr') return 'Telefoon';
		if (type === 'mail') return 'E-mail';
		if (type === 'online') return 'Website';
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	function contactHref(type: string, waarde: string) {
		if (type === 'mail') return `mailto:${waarde}`;
		if (type === 'telefoonnr') return `tel:${waarde}`;
		if (type === 'online') return waarde;
		return '#';
	}

	function betaalIcon(betaalwijze: string) {
		if (betaalwijze === 'gratis') return 'fa-gift';
		if (betaalwijze === 'sociaal tarief') return 'fa-hand-holding-heart';
		if (betaalwijze === 'online betaling') return 'fa-credit-card';
		return 'fa-coins';
	}

	const adresHero = [
		[actor.straatnaam, actor.huisnummer, actor.busnummer ? `bus ${actor.busnummer}` : '']
			.filter(Boolean)
			.join(' '),
		[actor.postcode, actor.gemeente].filter(Boolean).join(' ')
	]
		.filter(Boolean)
		.join(', ');

	let isFavoriet = $state(false);

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

	onMount(() => {
		isFavoriet = getFavorieten().includes(actor.id);
	});

	function toggleFavoriet(e: MouseEvent) {
		const btn = e.currentTarget as HTMLElement;
		let favorieten = getFavorieten();
		if (isFavoriet) {
			favorieten = favorieten.filter((id) => id !== actor.id);
			isFavoriet = false;
		} else {
			favorieten.push(actor.id);
			isFavoriet = true;
			spawnHearts(btn);
		}
		saveFavorieten(favorieten);
	}

	function spawnHearts(button: HTMLElement) {
		const count = Math.floor(Math.random() * 2) + 6;
		for (let i = 0; i < count; i++) setTimeout(() => spawnHeart(button), i * 80);
	}

	function spawnHeart(button: HTMLElement) {
		const rect = button.getBoundingClientRect();
		const drift = (Math.random() - 0.5) * 120;
		const duration = 600 + Math.random() * 600;
		const size = 0.8 + Math.random() * 1.2;
		const startRotate = (Math.random() - 0.5) * 30;
		const endRotate = (Math.random() - 0.5) * 60;
		const heart = document.createElement('span');
		heart.innerHTML = '<i class="fa fa-heart"></i>';
		heart.style.cssText = `color:var(--primary-red-color);position:fixed;font-size:${size}rem;pointer-events:none;z-index:9999;left:${rect.left + rect.width / 2 - 12}px;top:${rect.top}px;`;
		document.body.appendChild(heart);
		heart.animate(
			[
				{ transform: `translate(0,0) rotate(${startRotate}deg) scale(1)`, opacity: 1 },
				{
					transform: `translate(${drift}px,-90px) rotate(${endRotate}deg) scale(1.3)`,
					opacity: 1,
					offset: 0.45
				},
				{ transform: `translate(${drift}px,10px) rotate(${endRotate}deg) scale(0.7)`, opacity: 0 }
			],
			{ duration, easing: 'ease-out', fill: 'forwards' }
		).onfinish = () => heart.remove();
	}
</script>

<div class="banner">
	<div class="spacer-from-side">
		{#if actor.categorie}
			<span class="details-categorie-badge">
				<i class="fa fa-tag"></i>
				{actor.categorie.naam}
			</span>
		{/if}

		<div class="banner-title-row">
			<h1>{actor.publieke_naam}</h1>
			<button
				class="favoriet-button"
				class:favoriet-actief={isFavoriet}
				title={isFavoriet ? 'Verwijder uit favorieten' : 'Toevoegen aan favorieten'}
				type="button"
				onclick={toggleFavoriet}
			>
				<i class="fa fa-heart"></i>
			</button>
		</div>

		<hr class="small-yellow-line" />

		{#if actor.aangeboden_diensten}
			<p class="details-hero-omschrijving">{actor.aangeboden_diensten}</p>
		{/if}

		{#if adresHero}
			<div class="details-hero-adres">
				<i class="fa fa-map-marker-alt"></i>
				{adresHero}
			</div>
		{/if}
	</div>
</div>

<div class="details-body spacer-from-side">
	<div class="details-card card-contact">
		<h2>Contactgegevens</h2>
		<hr class="small-yellow-line card-line" />
		{#if actor.contactgegevens?.length}
			{#each actor.contactgegevens as contact}
				<div class="contact-item">
					<span class="contact-icon">
						<i class="fa {contactIcon(contact.type)}"></i>
					</span>
					<div class="contact-content">
						<span class="contact-label">{contactLabel(contact.type)}</span>
						<a
							class="contact-waarde"
							href={contactHref(contact.type, contact.waarde)}
							target={contact.type === 'online' ? '_blank' : undefined}
							rel={contact.type === 'online' ? 'noopener' : undefined}
						>
							{contact.waarde}
						</a>
					</div>
				</div>
			{/each}
		{:else}
			<p class="details-empty">
				<i class="fa fa-info-circle"></i> Geen contactgegevens beschikbaar.
			</p>
		{/if}
	</div>

	<div class="details-card card-betaal">
		<h2>Betaalwijze</h2>
		<hr class="small-yellow-line card-line" />
		{#if actor.betaalwijze}
			<div class="betaal-badge">
				<i class="fa {betaalIcon(actor.betaalwijze)}"></i>
				{actor.betaalwijze.charAt(0).toUpperCase() + actor.betaalwijze.slice(1)}
			</div>
		{:else}
			<p class="details-empty"><i class="fa fa-info-circle"></i> Niet opgegeven.</p>
		{/if}
	</div>

	<div class="details-card card-uren">
		<h2>Openingsuren</h2>
		<hr class="small-yellow-line card-line" />
		{#if actor.openingsuren?.length}
			<div class="uren-lijst">
				{#each DAGEN as dag}
					{@const uur = getUur(dag)}
					{@const open = isOpen(dag)}
					<div class="uur-rij" class:uur-gesloten={!open}>
						<span class="uur-dag">{dag.charAt(0).toUpperCase() + dag.slice(1)}</span>
						<span class="uur-tijd">
							{#if open}
								<i class="fa fa-clock"></i>
								{uur?.startuur.slice(0, 5)} - {uur?.einduur.slice(0, 5)}
							{:else}
								<i class="fa fa-times"></i>
								Gesloten
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="details-empty"><i class="fa fa-info-circle"></i> Geen openingsuren opgegeven.</p>
		{/if}
	</div>

	<div class="details-card card-locatie">
		<h2>Locatie</h2>
		<hr class="small-yellow-line card-line" />
		<div class="info-grid">
			<div class="info-item">
				<span class="info-label"><i class="fa fa-road"></i> Straat</span>
				<span class="info-value">
					{[actor.straatnaam, actor.huisnummer, actor.busnummer ? `bus ${actor.busnummer}` : '']
						.filter(Boolean)
						.join(' ') || '—'}
				</span>
			</div>
			<div class="info-item">
				<span class="info-label"><i class="fa fa-map-pin"></i> Postcode</span>
				<span class="info-value">{actor.postcode || '—'}</span>
			</div>
			<div class="info-item">
				<span class="info-label"><i class="fa fa-city"></i> Gemeente</span>
				<span class="info-value">{actor.gemeente || '—'}</span>
			</div>
		</div>
	</div>

	<div class="details-card card-doelgroep">
		<h2>Doelgroep</h2>
		<hr class="small-yellow-line card-line" />
		<div class="info-grid">
			{#if actor.leeftijdscategorie}
				<div class="info-item">
					<span class="info-label"><i class="fa fa-users"></i> Categorie</span>
					<span class="info-value">
						{actor.leeftijdscategorie.charAt(0).toUpperCase() + actor.leeftijdscategorie.slice(1)}
					</span>
				</div>
			{/if}
			{#if actor.leeftijd_min != null || actor.leeftijd_max != null}
				<div class="info-item">
					<span class="info-label"><i class="fa fa-child"></i> Leeftijd</span>
					<span class="info-value">
						{#if actor.leeftijd_min != null && actor.leeftijd_max != null}
							{actor.leeftijd_min} – {actor.leeftijd_max} jaar
						{:else if actor.leeftijd_min != null}
							Vanaf {actor.leeftijd_min} jaar
						{:else}
							Tot {actor.leeftijd_max} jaar
						{/if}
					</span>
				</div>
			{/if}
			{#if !actor.leeftijdscategorie && actor.leeftijd_min == null && actor.leeftijd_max == null}
				<p class="details-empty"><i class="fa fa-info-circle"></i> Niet opgegeven.</p>
			{/if}
		</div>
	</div>

	{#if actor.actor_rubriek?.length}
		<div class="details-card card-rubrieken">
			<h2>Rubrieken</h2>
			<hr class="small-yellow-line card-line" />
			<div class="rubriek-tags">
				{#each actor.actor_rubriek as { rubriek }}
					<span class="rubriek-tag">
						<i class="fa fa-bookmark"></i>
						{rubriek.naam}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.banner {
		background: linear-gradient(
			to left,
			var(--primary-blue-color),
			var(--primary-lightdarkblue-color)
		);
		color: var(--primary-white-color);
		min-height: 50vh;
		width: auto;
		text-align: center;
	}

	.spacer-from-side {
		padding: 0 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.details-categorie-badge {
		padding: 5px 15px;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 20px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 65px;
	}

	.banner-title-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: center;
	}

	.banner h1 {
		font-size: 4rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: var(--primary-white-color);
	}

	.favoriet-button {
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		width: 42px;
		height: 42px;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.favoriet-button:hover {
		background: rgba(255, 255, 255, 0.25);
		color: white;
	}

	.favoriet-button.favoriet-actief {
		color: var(--primary-red-color);
		background: white;
		border-color: white;
	}

	.small-yellow-line {
		margin: 5px auto 20px;
		width: 95%;
		max-width: 600px;
		height: 5px;
		background-color: var(--secondary-yellow-color);
		border: 0;
	}

	.card-line {
		width: 80px;
		margin: 10px 0 20px;
	}

	.details-hero-omschrijving {
		font-size: 15px;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.65;
		max-width: 600px;
		margin: 0 auto 20px;
	}

	.details-hero-adres {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 15px;
		color: rgba(255, 255, 255, 0.55);
		margin-bottom: 40px;
	}

	.details-body {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		grid-template-rows: auto auto auto auto;
		grid-template-areas:
			'contact   contact   betaal'
			'uren      locatie   locatie'
			'uren      doelgroep doelgroep'
			'rubrieken rubrieken rubrieken';
		gap: 10px;
		max-width: 1000px;
		margin: 0 auto;
		padding: 30px 20px 60px;
	}

	.card-contact {
		grid-area: contact;
	}
	.card-betaal {
		grid-area: betaal;
	}
	.card-uren {
		grid-area: uren;
	}
	.card-locatie {
		grid-area: locatie;
	}
	.card-doelgroep {
		grid-area: doelgroep;
	}
	.card-rubrieken {
		grid-area: rubrieken;
	}

	.details-card {
		background: var(--primary-white-color);
		border: 0.5px solid var(--secondary-border-blur-color);
		border-radius: 15px;
		padding: 25px 30px;
		height: calc(100% - 50px);
	}

	.details-card h2 {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 0;
		color: var(--primary-dark-color);
	}

	.details-empty {
		font-size: 15px;
		color: var(--secondary-lightgray-color);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.contact-item {
		display: flex;
		align-items: center;
		gap: 15px;
		padding: 10px 0;
		border-bottom: 0.5px solid var(--secondary-border-blur-color);
	}

	.contact-icon {
		width: 35px;
		height: 35px;
		background: var(--secondary-broken-white-color);
		border: 0.5px solid var(--secondary-border-blur-color);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-size: 15px;
		color: var(--primary-blue-color);
	}

	.contact-content {
		display: flex;
		flex-direction: column;
	}

	.contact-label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: var(--secondary-lightgray-color);
		line-height: 1.5;
	}

	.contact-waarde {
		font-size: 15px;
		color: var(--primary-dark-color);
		text-decoration: none;
		word-break: break-word;
		transition: color 0.2s;
	}

	.contact-waarde:hover {
		color: var(--primary-blue-color);
	}

	.betaal-badge {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 20px;
		background: var(--secondary-broken-white-color);
		border: 0.5px solid var(--secondary-border-blur-color);
		border-radius: 10px;
		font-size: 15px;
		font-weight: 500;
		color: var(--primary-dark-color);
	}

	.betaal-badge i {
		color: var(--primary-blue-color);
	}

	.uren-lijst {
		display: flex;
		flex-direction: column;
	}

	.uur-rij {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		border-bottom: 0.5px solid var(--secondary-border-blur-color);
		gap: 40px;
	}

	.uur-dag {
		font-size: 15px;
		font-weight: 500;
		color: var(--primary-dark-color);
	}

	.uur-gesloten .uur-dag {
		color: var(--secondary-lightgray-color);
		font-weight: 400;
	}

	.uur-tijd {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 15px;
		color: var(--primary-dark-color);
		font-variant-numeric: tabular-nums;
	}

	.uur-gesloten .uur-tijd {
		font-size: 12.5px;
		color: var(--secondary-lightgray-color);
		font-style: italic;
	}

	.uur-gesloten .uur-tijd :global(i) {
		color: #fca5a5;
	}
	.uur-rij:not(.uur-gesloten) .uur-tijd :global(i) {
		color: #16a34a;
	}

	.info-grid {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.info-label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: var(--secondary-lightgray-color);
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.info-label :global(i) {
		color: var(--primary-blue-color);
		width: 15px;
		text-align: center;
	}

	.info-value {
		font-size: 15px;
		color: var(--primary-dark-color);
		padding-left: 20px;
	}

	.rubriek-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.rubriek-tag {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 15px;
		background: var(--secondary-broken-white-color);
		border: 0.5px solid var(--secondary-border-blur-color);
		border-radius: 20px;
		font-size: 15px;
		color: var(--primary-dark-color);
	}

	.rubriek-tag :global(i) {
		color: var(--primary-blue-color);
		font-size: 10px;
	}

	@media screen and (max-width: 850px) {
		.banner {
			min-height: 40vh;
		}
		.banner h1 {
			font-size: 2.5rem;
		}

		.details-body {
			grid-template-columns: 1fr 1fr;
			grid-template-areas:
				'contact   contact'
				'betaal    betaal'
				'uren      uren'
				'locatie   locatie'
				'doelgroep doelgroep'
				'rubrieken rubrieken';
			padding: 20px 20px 40px;
		}
	}

	@media screen and (max-width: 550px) {
		.banner {
			min-height: 30vh;
		}
		.banner h1 {
			font-size: 6vw;
			padding: 20px;
		}

		.details-body {
			grid-template-columns: 1fr;
			grid-template-areas:
				'contact'
				'betaal'
				'uren'
				'locatie'
				'doelgroep'
				'rubrieken';
			padding: 15px 15px 30px;
		}
	}
</style>
