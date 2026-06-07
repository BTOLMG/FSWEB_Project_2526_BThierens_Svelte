<script lang="ts">
	import type { PageData } from './$types';
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import { onMount } from 'svelte';
	
	import searchImg from '$lib/assets/search-icon.png';

	let { data }: { data: PageData } = $props();

	let inputValue = $state(data.searchTerm || '');
	let inputBox: HTMLTextAreaElement;

	let favorieten: number[] = $state([]);

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
		favorieten = getFavorieten();
	});

	function toggleFavoriet(actorId: number) {
		if (favorieten.includes(actorId)) {
			favorieten = favorieten.filter((id) => id !== actorId);
		} else {
			favorieten = [...favorieten, actorId];	
			spawnHeartsById(actorId);
		}
		saveFavorieten(favorieten);
	}

	function spawnHeartsById(actorId: number) {
		const button = document.querySelector<HTMLElement>(`[data-id="${actorId}"]`);
		if (button) spawnHearts(button);
	}

	function spawnHearts(button: HTMLElement) {
		const count = Math.floor(Math.random() * 2) + 6;
		for (let i = 0; i < count; i++) setTimeout(() => spawnHeart(button), i * 80);
	}

	// https://codepen.io/yukos/pen/ByNqVvG
	// maar dan geanimeerd zodat de vliegen omhoog en dan vallen naar beneden
	function spawnHeart(button: HTMLElement) {
		const rect = button.getBoundingClientRect();
		const drift = (Math.random() - 0.5) * 120;
		const duration = 600 + Math.random() * 600;
		const size = 0.8 + Math.random() * 1.2;
		const startRotate = (Math.random() - 0.5) * 30;
		const endRotate = (Math.random() - 0.5) * 60;

		const heart = document.createElement('span');
		heart.innerHTML = '<i class="fa fa-heart"></i>';
		heart.style.cssText = `
			color: var(--primary-red-color);
			position: fixed;
			font-size: ${size}rem;
			pointer-events: none;
			z-index: 9999;
			left: ${rect.left + rect.width / 2 - 12}px;
			top: ${rect.top}px;
		`;
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

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			const form = inputBox.closest('form');
			if (form) form.submit();
		}
	}

	function toggleAccordion(panel: HTMLElement) {
		panel.classList.toggle('open');
	}

	function removeFilter(name: string, value: string) {
		const form = document.getElementById('filter-form') as HTMLFormElement;
		form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
			if (input.value === value) input.checked = false;
		});
		form.submit();
	}

	function filterAccordionItems(
		input: HTMLInputElement,
		lijstId: string,
		geenResultatenId: string
	) {
		const zoekterm = input.value.trim().toLowerCase();
		const lijst = document.getElementById(lijstId)!;
		const geenResultaten = document.getElementById(geenResultatenId)!;
		let aantalZichtbaar = 0;

		lijst.querySelectorAll<HTMLLIElement>('li').forEach((item) => {
			const tekst = item.dataset.zoekterm ?? '';
			const tonen = zoekterm === '' || tekst.includes(zoekterm);
			item.style.display = tonen ? '' : 'none';
			if (tonen) {
				aantalZichtbaar++;
				const labelEl = item.querySelector('.accordionItem-label');
				if (labelEl) {
					if (zoekterm === '') {
						labelEl.innerHTML = labelEl.textContent ?? '';
					} else {
						const orig = labelEl.textContent ?? '';
						const regex = new RegExp(`(${zoekterm})`, 'gi');
						labelEl.innerHTML = orig.replace(regex, '<b>$1</b>');
					}
				}
			}
		});

		geenResultaten.classList.toggle('hidden', aantalZichtbaar > 0);
	}

	const hasFilters =
		// svelte-ignore state_referenced_locally
		(data.meta.selectedGemeentes?.length ?? 0) > 0 ||
		(data.meta.selectedRubrieken?.length ?? 0) > 0;

	function formatAdres(actor: (typeof data.results)[0]): string {
		const straat = [actor.straatnaam, actor.huisnummer, actor.busnummer]
			.filter(Boolean)
			.join(' ');
		const plaats = [actor.postcode, actor.gemeente].filter(Boolean).join(' ');
		return [straat, plaats].filter(Boolean).join(', ');
	}
</script>

<div class="margin-side">
	<div class="search-banner">
		<h1>Hulp in jouw buurt</h1>
		{#if data.searchTerm == null}
			<p>We vonden {data.results.length} resultaten</p>
		{:else if data.results.length > 0}
			<p>We vonden {data.results.length} resultaten voor "<strong>{data.searchTerm}</strong>"</p>
		{:else}
			<p>We vonden geen resultaten voor "<strong>{data.searchTerm}</strong>"</p>
		{/if}
	</div>

	<div class="search-filter-main-divider">
		<!-- ── Filters sidebar ─────────────────────────────────────── -->
		<div class="filters">
			<form method="GET" action="/search" id="filter-form">
				<a class="linkToKaartPagina" href="/kaart">
					Zie deze op een kaart <i class="fa fa-location"></i>
				</a>

				<div class="search-wrapper">
					<img src={searchImg} alt="Search Icon" class="search-icon" />

					<textarea
						bind:this={inputBox}
						bind:value={inputValue}
						id="input-box"
						name="zoekterm"
						placeholder={data.searchTerm ?? 'Geef een zoekterm in'}
						onkeydown={handleKeyDown}
					></textarea>

					<button type="submit">ZOEKEN</button>
				</div>
				
				<SearchAutocomplete bind:inputValue />

				<!-- Active filter chips -->
				{#if hasFilters}
					<div class="active-filters">
						{#each data.meta.selectedGemeentes ?? [] as gemeente}
							<span class="active-filter-chip">
								{gemeente}
								<button
									type="button"
									class="chip-remove"
									onclick={() => removeFilter('gemeentes[]', gemeente)}
									title="Verwijder filter {gemeente}"
								>x</button>
							</span>
						{/each}
						{#each data.meta.selectedRubrieken ?? [] as rubriek}
							<span class="active-filter-chip chip-rubriek">
								{rubriek}
								<button
									type="button"
									class="chip-remove"
									onclick={() => removeFilter('rubrieken[]', rubriek)}
									title="Verwijder filter {rubriek}"
								>x</button>
							</span>
						{/each}
					</div>
				{/if}

				<div class="filter-header">
					<span class="filter-title">Resultaten filteren</span>
					{#if hasFilters}
						<a
							href="/search{data.searchTerm ? `?zoekterm=${data.searchTerm}` : ''}"
							class="filters-clear"
						>
							Filters wissen
						</a>
					{/if}
				</div>

				<!-- Gemeente accordion -->
				{#if data.gemeenteAccordionItems && Object.keys(data.gemeenteAccordionItems).length > 0}
					<div
						class="accordion-panel {(data.meta.selectedGemeentes?.length ?? 0) > 0 ? 'open' : ''}"
					>
						<button
							type="button"
							class="accordion-header"
							onclick={(e) => toggleAccordion(e.currentTarget.closest('.accordion-panel')!)}
						>
							<span>Gevestigd in</span>
							<i class="fa fa-chevron-down accordion-icon"></i>
						</button>
						<div class="accordion-body">
							<div class="accordionItem-scroll">
								<div class="accordion-search-wrapper">
									<i class="fa fa-search accordion-search-icon"></i>
									<input
										type="text"
										class="accordion-search-input"
										placeholder="Zoek gemeente of postcode..."
										oninput={(e) =>
											filterAccordionItems(
												e.currentTarget,
												'gemeente-list',
												'gemeente-geen-resultaten'
											)}
									/>
								</div>
								<ul class="accordionItem-list" id="gemeente-list">
									{#each Object.entries(data.gemeenteAccordionItems) as [label, count]}
										{@const checked = (data.meta.selectedGemeentes ?? []).includes(label)}
										<li data-zoekterm={label.toLowerCase()}>
											<label class="accordionItem-item {checked ? 'checked' : ''}">
												<input
													type="checkbox"
													name="gemeentes[]"
													value={label}
													{checked}
													onchange={(e) => e.currentTarget.form?.submit()}
												/>
												<span class="accordionItem-check"></span>
												<span class="accordionItem-label">{label}</span>
												<span class="accordionItem-count">{count}</span>
											</label>
										</li>
									{/each}
								</ul>
								<p class="accordion-geen-resultaten hidden" id="gemeente-geen-resultaten">
									Geen overeenkomsten gevonden.
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Rubriek accordion -->
				{#if data.rubriekAccordionItems && Object.keys(data.rubriekAccordionItems).length > 0}
					<div
						class="accordion-panel {(data.meta.selectedRubrieken?.length ?? 0) > 0 ? 'open' : ''}"
					>
						<button
							type="button"
							class="accordion-header"
							onclick={(e) => toggleAccordion(e.currentTarget.closest('.accordion-panel')!)}
						>
							<span>Rubrieken</span>
							<i class="fa fa-chevron-down accordion-icon"></i>
						</button>
						<div class="accordion-body">
							<div class="accordionItem-scroll">
								<div class="accordion-search-wrapper">
									<i class="fa fa-search accordion-search-icon"></i>
									<input
										type="text"
										class="accordion-search-input"
										placeholder="Zoek rubriek..."
										oninput={(e) =>
											filterAccordionItems(
												e.currentTarget,
												'rubriek-list',
												'rubriek-geen-resultaten'
											)}
									/>
								</div>
								<ul class="accordionItem-list" id="rubriek-list">
									{#each Object.entries(data.rubriekAccordionItems) as [naam, count]}
										{@const checked = (data.meta.selectedRubrieken ?? []).includes(naam)}
										<li data-zoekterm={naam.toLowerCase()}>
											<label class="accordionItem-item {checked ? 'checked' : ''}">
												<input
													type="checkbox"
													name="rubrieken[]"
													value={naam}
													{checked}
													onchange={(e) => e.currentTarget.form?.submit()}
												/>
												<span class="accordionItem-check"></span>
												<span class="accordionItem-label">{naam}</span>
												<span class="accordionItem-count">{count}</span>
											</label>
										</li>
									{/each}
								</ul>
								<p class="accordion-geen-resultaten hidden" id="rubriek-geen-resultaten">
									Geen overeenkomsten gevonden.
								</p>
							</div>
						</div>
					</div>
				{/if}
			</form>
		</div>

		<!-- ── Results ────────────────────────────────────────────── -->
		<div class="main-content">
			{#if data.results.length === 0}
				<div class="no-results">
					<div class="no-results-icon">
						<img src={searchImg} alt="Search Icon" />
					</div>
					<p class="no-results-title">Geen resultaten gevonden</p>
					<p class="no-results-sub">Probeer een andere zoekterm of pas de filters aan.</p>
					<a href="/search" class="no-results-reset">Alle resultaten tonen</a>
				</div>
			{:else}
				{#each data.results as actor (actor.id)}
					{@const telefoon = actor.contactgegevens?.find((c) => c.type === 'telefoonnr')?.waarde}
					{@const mail = actor.contactgegevens?.find((c) => c.type === 'mail')?.waarde}
					{@const website = actor.contactgegevens?.find((c) => c.type === 'online')?.waarde}
					{@const adres = formatAdres(actor)}
					{@const openingstijden = actor.openingsuren
						?.map(
							(u) =>
								`${u.dag_van_de_week.charAt(0).toUpperCase() + u.dag_van_de_week.slice(1)}: ${u.startuur.slice(0, 5)} - ${u.einduur.slice(0, 5)}`
						)
						.join(', ')}
					{@const isFavoriet = favorieten.includes(actor.id)}

					<div class="card">
						<div class="card-info">
							{#if actor.categorie}
								<span class="thema">{actor.categorie.naam}</span>
							{/if}
							<button
								class="favoriet-button {isFavoriet ? 'favoriet-actief' : ''}"
								title={isFavoriet ? 'Verwijder uit favorieten' : 'Toevoegen aan favorieten'}
								data-id={actor.id}
								type="button"
								onclick={() => toggleFavoriet(actor.id)}
							>
								<i class="fa fa-heart"></i>
							</button>
						</div>

						<div class="card-body">
							<div class="body-left">
								<h2>{actor.publieke_naam}</h2>
								<p>{actor.aangeboden_diensten || ''}</p>

								{#if actor.actor_rubriek?.length}
									<ul class="extra-info-container">
										{#each actor.actor_rubriek as { rubriek }}
											<li class="extra-info">{rubriek.naam}</li>
										{/each}
									</ul>
								{/if}
							</div>

							<div class="body-right">
								{#if openingstijden}
									<p><strong>Openingsuren:</strong> {openingstijden}</p>
								{/if}
								{#if adres}
									<p><strong>Adres:</strong> {adres}</p>
								{/if}
								{#if telefoon}
									<p><strong>Telefoon:</strong> <a href="tel:{telefoon}">{telefoon}</a></p>
								{/if}
								{#if mail}
									<p><strong>Mail:</strong> <a href="mailto:{mail}">{mail}</a></p>
								{/if}
								{#if website}
									<p>
										<strong>Website:</strong>
										<a href={website} target="_blank" rel="noopener noreferrer">{website}</a>
									</p>
								{/if}
							</div>
						</div>

						<a href="/details/{actor.id}" class="details-link">Bekijk details</a>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	a {
		word-break: break-word;
	}

	.margin-side {
		margin: 0 2rem;
	}

	.linkToKaartPagina {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		background-color: var(--primary-lightblue-color);
		color: var(--primary-blue-color);
		border-radius: 100px;
		padding: 0.75rem 1.25rem;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		transition: background-color 0.2s;
	}

	.linkToKaartPagina:hover {
		background-color: oklch(from var(--primary-lightblue-color) calc(l * 0.95) c h);
	}

	.search-wrapper {
		background-color: var(--primary-white-color);
		display: flex;
		align-items: center;
		padding: 8px 10px 8px 15px;
		border-radius: 100px;
		width: 100%;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
		z-index: 100;
		transition: box-shadow 0.2s;
	}

	.search-icon {
		margin-right: 10px;
		flex-shrink: 0;
		max-width: 20px;
		height: auto;
	}

	.search-wrapper textarea {
		border: none;
		outline: none;
		flex-grow: 1;
		font-size: 14px;
		color: var(--primary-dark-color);
		background: transparent;
		resize: none;
		overflow: hidden;
		min-height: 20px;
		line-height: 1.3;
		font-family: inherit;
		padding: 0;
	}

	.search-wrapper textarea::placeholder {
		color: #ccc;
		font-weight: 400;
	}

	.search-wrapper button {
		background-color: var(--secondary-yellow-color);
		color: var(--secondary-gray-color);
		border: none;
		border-radius: 100px;
		padding: 10px 20px;
		font-weight: bold;
		font-size: 12px;
		cursor: pointer;
		transition: background-color 0.2s;
		white-space: nowrap;
		font-family: inherit;
	}

	.search-wrapper button:hover {
		background-color: oklch(from var(--secondary-yellow-color) calc(l * 0.95) c h);
	}

	.search-wrapper {
		width: auto !important;
	}

	.search-banner {
		margin: 2rem 0;
	}

	.search-banner h1 {
		line-height: 80%;
		font-size: 4vw;
		font-weight: 700;
		margin-bottom: 0;
		color: var(--primary-blue-color);
	}

	.search-banner p {
		font-size: 1rem;
		color: var(--secondary-blue-text-color);
	}

	.search-filter-main-divider {
		display: grid;
		grid-template-columns: 1fr 3fr;
		gap: 2rem;
		margin-bottom: 5rem;
		align-items: start;
	}

	.filters {
		position: sticky;
		top: 75px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filters form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.active-filters {
		max-width: 700px;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 0.25rem 0;
	}

	.active-filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background-color: var(--primary-lightblue-color);
		color: var(--primary-darkblue-color);
		border: 1px solid var(--primary-blue-color);
		border-radius: 20px;
		padding: 3px 10px 3px 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.active-filter-chip.chip-rubriek {
		background-color: var(--secondary-lightyellow-color);
		color: var(--secondary-darkyellow-color);
		border-color: var(--secondary-yellow-color);
	}

	.chip-remove {
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		padding: 0;
		color: inherit;
		opacity: 0.7;
		transition: opacity 0.2s;
	}

	.chip-remove:hover {
		opacity: 1;
	}

	.filter-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		width: 100%;
		max-width: 700px;
		padding: 0.75rem 0 0.25rem;
		border-bottom: 2px solid var(--primary-blue-color);
		margin-bottom: 0.25rem;
	}

	.filter-title {
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--primary-dark-color);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.filters-clear {
		font-size: 0.75rem;
		text-decoration: none;
		cursor: pointer;
		background-color: var(--primary-red-color);
		color: var(--primary-white-color);
		padding: 5px 15px;
		border-radius: 20px;
		transition: background-color 0.2s;
	}

	.filters-clear:hover {
		background-color: oklch(from var(--primary-red-color) calc(l * 0.9) c h);
	}

	.accordion-panel {
		width: 100%;
		max-width: 700px;
		border-bottom: 1px solid oklch(from var(--secondary-lightgray-color) calc(l * 1.15) c h);
	}

	.accordion-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.8rem 0.25rem;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--primary-dark-color);
		text-align: left;
		transition: color 0.2s;
		gap: 0.5rem;
	}

	.accordion-header:hover {
		color: var(--primary-blue-color);
	}

	.accordion-icon {
		flex-shrink: 0;
		font-size: 0.75rem;
		transition: transform 0.2s;
		color: var(--secondary-gray-color);
	}

	.accordion-panel.open .accordion-icon {
		transform: rotate(180deg);
	}

	.accordion-body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.2s;
		overflow: hidden;
	}

	.accordion-panel.open .accordion-body {
		grid-template-rows: 1fr;
	}

	.accordionItem-scroll {
		overflow: hidden;
		min-height: 0;
	}

	.accordion-panel.open .accordionItem-scroll {
		overflow-y: auto;
		max-height: 240px;
		scrollbar-color: var(--secondary-yellow-color) transparent;
	}

	.accordion-panel.open .accordionItem-scroll:hover {
		scrollbar-color: oklch(from var(--secondary-yellow-color) calc(l * 0.95) c h) transparent;
	}

	.accordionItem-list {
		list-style: none;
		margin: 0;
		padding: 0 0 0.5rem;
	}

	.accordionItem-item {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.4rem 0.25rem;
		cursor: pointer;
		border-radius: 6px;
		transition: background-color 0.2s;
		font-size: 0.8rem;
		color: var(--primary-dark-color);
	}

	.accordionItem-item input[type='checkbox'] {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.accordionItem-item:hover {
		background-color: var(--primary-lightblue-color);
	}

	.accordionItem-item.checked {
		color: var(--primary-blue-color);
		font-weight: 700;
	}

	.accordionItem-check {
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

	.accordionItem-item.checked .accordionItem-check {
		background-color: var(--primary-blue-color);
		border-color: var(--primary-blue-color);
	}

	.accordionItem-item.checked .accordionItem-check::after {
		content: '';
		display: block;
		width: 10px;
		height: 5px;
		border-left: 2px solid #fff;
		border-bottom: 2px solid #fff;
		transform: rotate(-45deg) translateY(-1px);
	}

	.accordionItem-label {
		flex: 1;
		line-height: 1.5;
	}

	.accordionItem-count {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: var(--secondary-gray-color);
		font-variant-numeric: tabular-nums;
	}

	.accordion-search-wrapper {
		position: relative;
		margin-bottom: 0.35rem;
	}

	.accordion-search-icon {
		position: absolute;
		left: 0.65rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--secondary-lightgray-color);
		font-size: 0.75rem;
		pointer-events: none;
	}

	.accordion-search-input {
		width: 100%;
		padding: 0.45rem 0.75rem 0.45rem 1.9rem;
		border: 1.5px solid var(--secondary-border-blur-color);
		border-radius: 8px;
		font-size: 0.8rem;
		font-family: inherit;
		background-color: var(--primary-white-color);
		color: var(--primary-dark-color);
		outline: none;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.accordion-search-input::placeholder {
		color: var(--secondary-lightgray-color);
	}

	.accordion-search-input:focus {
		border-color: var(--primary-blue-color);
	}

	.accordion-geen-resultaten {
		font-size: 0.8rem;
		color: var(--secondary-lightgray-color);
		padding: 0.5rem 0.25rem;
		margin: 0;
	}

	.hidden {
		display: none !important;
	}

	:global(.accordionItem-label b) {
		color: var(--primary-blue-color);
		font-weight: 700;
	}

	.main-content {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 4rem 2rem;
		text-align: center;
		color: var(--secondary-lightgray-color);
	}

	.no-results-icon img {
		width: 3rem;
		height: auto;
	}

	.no-results-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--secondary-gray-color);
		margin: 0;
	}

	.no-results-sub {
		font-size: 0.9rem;
		margin: 0;
	}

	.no-results-reset {
		margin-top: 1rem;
		color: var(--primary-white-color);
		font-weight: 700;
		text-decoration: none;
		border-radius: 20px;
		padding: 8px 20px;
		background-color: var(--primary-blue-color);
		transition: background-color 0.2s;
	}

	.no-results-reset:hover {
		background-color: var(--primary-darkblue-color);
	}

	.card {
		background-color: var(--secondary-broken-white-color);
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.card-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.thema {
		color: var(--primary-blue-color);
		font-weight: 700;
		text-transform: uppercase;
	}

	.favoriet-button {
		border: none;
		cursor: pointer;
		font-size: 1.5rem;
		background-color: transparent;
		color: var(--secondary-gray-color);
		transition: color 0.25s;
	}

	.favoriet-button.favoriet-actief {
		color: var(--primary-red-color);
	}

	.card-body {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.body-left {
		width: 50%;
	}

	.body-right {
		margin-left: auto;
		text-wrap: normal;
		width: 40%;
	}

	.extra-info-container {
		padding: 0;
		margin: 0.5rem 0 0;
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		flex-wrap: wrap;
		list-style: none;
	}

	.extra-info {
		background-color: var(--secondary-border-blur-color);
		color: var(--secondary-gray-color);
		padding: 5px 10px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: bold;
		display: inline-block;
	}

	.details-link {
		align-self: flex-start;
		color: var(--primary-white-color);
		font-weight: 700;
		text-decoration: none;
		transition: all 0.3s;
		border-radius: 20px;
		padding: 6px 12px;
		background-color: var(--primary-blue-color);
	}

	.details-link:hover {
		background-color: oklch(from var(--primary-blue-color) calc(l * 0.85) c h);
	}

	@media screen and (max-width: 1000px) {
		.search-banner h1 {
			font-size: 3rem;
		}

		.search-filter-main-divider {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.filters {
			position: static;
		}

		.search-wrapper {
			width: 100% !important;
		}

		.card-body {
			flex-direction: column;
			gap: 1rem;
		}

		.body-left,
		.body-right {
			width: 100%;
		}
	}

	@media screen and (max-width: 400px) {
		.search-banner h1 {
			font-size: 11vw;
		}

		.margin-side {
			margin: 0 1rem;
		}
	}
</style>