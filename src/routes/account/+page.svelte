<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let zoekterm = $state('');
	let nieuweNaam = $state('');
	let nieuweCategorieId = $state('');
	let statusMsg = $state('');
	let errorMsg = $state('');
	let creating = $state(false);

	$effect(() => {
		if (form?.success) {
			statusMsg = 'Actie succesvol uitgevoerd!';
			nieuweNaam = '';
			nieuweCategorieId = '';
			errorMsg = '';
		} else if (form?.error) {
			errorMsg = form.error;
			statusMsg = '';
		}
	});

	const filteredActoren = $derived(
		zoekterm.trim() === ''
			? data.actoren
			: data.actoren.filter((a) => {
					const term = zoekterm.toLowerCase();
					return (
						a.publieke_naam.toLowerCase().includes(term) ||
						(a.gemeente ?? '').toLowerCase().includes(term) ||
						(a.categorie?.naam ?? '').toLowerCase().includes(term)
					);
				})
	);

	async function logout() {
		const response = await fetch('/logout', { method: 'POST' });
		if (response.ok) {
			await invalidateAll();
			goto('/login');
		}
	}

	function formatDate(d: string | null) {
		if (!d) return null;
		return new Date(d).toLocaleDateString('nl-BE');
	}
</script>

<div class="beheer-layout">
	<main class="beheer-main">
		<div class="beheer-header">
			<h1>Mijn Actoren</h1>
			<p>Kies een actor om de gegevens te bekijken en bij te werken.</p>
		</div>

		{#if statusMsg}
			<div class="alert alert-success"><i class="fa fa-circle-check"></i> {statusMsg}</div>
		{/if}
		{#if errorMsg}
			<div class="alert alert-error">{errorMsg}</div>
		{/if}

		<div class="overzicht-blok">
			<div class="overzicht-blok-header">
				<div>
					<h2 class="overzicht-blok-titel">
						<i class="fa fa-building"></i> Mijn actoren
					</h2>
					<p class="overzicht-blok-sub">
						{data.actoren.length}
						{data.actoren.length === 1 ? 'actor' : 'actoren'} gekoppeld aan jouw account
					</p>
				</div>
				{#if data.actoren.length > 4}
					<div class="overzicht-search-wrap">
						<i class="fa fa-search overzicht-search-icon"></i>
						<input
							type="text"
							class="overzicht-search"
							placeholder="Zoek op naam of gemeente…"
							bind:value={zoekterm}
						/>
					</div>
				{/if}
			</div>

			{#if filteredActoren.length === 0 && zoekterm}
				<p class="overzicht-geen">Geen actoren gevonden voor deze zoekterm.</p>
			{/if}

			<ul class="overzicht-lijst">
				{#each filteredActoren as actor (actor.id)}
					<li class="overzicht-item">
						<div class="overzicht-item-info">
							<div class="overzicht-item-naam">
								{actor.publieke_naam}
								{#if actor.isVisible}
									<span class="overzicht-badge badge-zichtbaar">
										<i class="fa fa-eye"></i> zichtbaar
									</span>
								{:else}
									<span class="overzicht-badge badge-verborgen">
										<i class="fa fa-eye-slash"></i> verborgen
									</span>
								{/if}
							</div>
							<div class="overzicht-item-meta">
								{#if actor.categorie}
									<span><i class="fa fa-tag"></i> {actor.categorie.naam}</span>
								{/if}
								{#if actor.gemeente}
									<span><i class="fa fa-location-dot"></i> {actor.gemeente}</span>
								{/if}
								{#if actor.last_updated}
									<span
										><i class="fa fa-clock"></i> Bijgewerkt op {formatDate(
											actor.last_updated
										)}</span
									>
								{/if}
							</div>
						</div>
						<div class="overzicht-item-acties">
							<a
								href="/details/{actor.id}"
								class="overzicht-btn-view"
								target="_blank"
								title="Bekijk detailpagina"
							>
								<i class="fa fa-arrow-up-right-from-square"></i>
							</a>
							<a
								href="/account/{actor.id}/edit"
								class="overzicht-btn-edit"
								title="Gegevens bewerken"
							>
								<i class="fa fa-pen"></i>
							</a>
							<form
								method="POST"
								action="?/deleteActor"
								use:enhance={() => {
									if (!confirm(`Weet je zeker dat je "${actor.publieke_naam}" wil verwijderen?`)) {
										return () => {};
									}
									return async ({ update }) => {
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={actor.id} />
								<button type="submit" class="overzicht-btn-delete" title="Verwijderen">
									<i class="fa fa-trash"></i>
								</button>
							</form>
						</div>
					</li>
				{:else}
					<li class="overzicht-leeg">Er zijn nog geen actoren aan jouw account gekoppeld.</li>
				{/each}
			</ul>
		</div>

		<form
			method="POST"
			action="?/createActor"
			use:enhance={() => {
				creating = true;
				return async ({ update }) => {
					await update();
					creating = false;
				};
			}}
		>
			<div class="form-section">
				<div class="form-section-label">
					<h3>Hoofd Gegevens</h3>
					<p>De belangrijkste informatie van de actor. De categorie is niet aanpasbaar.</p>
				</div>
				<div class="form-section-fields">
					<div class="field field-full">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Publieke naam</label>
						<input
							type="text"
							name="publieke_naam"
							bind:value={nieuweNaam}
							placeholder="Naam actor"
						/>
					</div>
					<div class="field field-full">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Categorie</label>
						<select name="categorie_id" bind:value={nieuweCategorieId}>
							<option value="">— Selecteer —</option>
							{#each data.categorieen as cat}
								<option value={cat.id}>{cat.naam}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<div class="form-footer">
				<div class="form-footer-actions">
					<button
						type="submit"
						class="btn btn-primary"
						disabled={creating || !nieuweNaam.trim() || !nieuweCategorieId}
					>
						<i class="fa fa-plus"></i>
						{creating ? 'Bezig…' : 'Actor aanmaken'}
					</button>
				</div>
			</div>
		</form>

		<div class="logout-wrap">
			<button type="button" class="btn btn-ghost" onclick={logout}>
				<i class="fa fa-arrow-right-from-bracket"></i> Uitloggen
			</button>
		</div>
	</main>
</div>

<style>
	.beheer-layout {
		display: flex;
		justify-content: center;
		min-height: calc(100vh - 56px);
		background: var(--secondary-broken-white-color);
	}
	.beheer-main {
		padding: 2rem;
		width: 100%;
		max-width: 900px;
	}
	.beheer-header {
		margin-bottom: 1.25rem;
	}
	.beheer-header h1 {
		font-size: 24px;
		font-weight: 500;
		margin-bottom: 5px;
		color: var(--primary-dark-color);
	}
	.beheer-header p {
		font-size: 15px;
		color: var(--secondary-gray-color);
	}

	.alert {
		padding: 10px 15px;
		border-radius: 10px;
		font-size: 15px;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.alert-success {
		background: var(--error-succes-bgcolor);
		color: var(--error-succes-color);
	}
	.alert-error {
		background: var(--error-fail-bgcolor);
		color: var(--error-fail-color);
	}

	.overzicht-blok {
		background: var(--primary-white-color);
		border: 0.5px solid var(--secondary-border-blur-color);
		border-radius: 15px;
		margin-bottom: 1.5rem;
		overflow: hidden;
	}
	.overzicht-blok-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 15px;
		padding: 1.1rem 1.25rem;
		border-bottom: 0.5px solid var(--secondary-border-blur-color);
		background: var(--secondary-broken-white-color);
	}
	.overzicht-blok-titel {
		font-size: 15px;
		font-weight: 600;
		color: var(--primary-dark-color);
		margin: 0 0 2px;
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.overzicht-blok-titel i {
		color: var(--primary-blue-color);
	}
	.overzicht-blok-sub {
		font-size: 10px;
		color: var(--secondary-lightgray-color);
		margin: 0;
	}
	.overzicht-search-wrap {
		position: relative;
		flex-shrink: 0;
	}
	.overzicht-search-icon {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 10px;
		color: var(--secondary-lightgray-color);
		pointer-events: none;
	}
	.overzicht-search {
		padding: 7.5px 15px 7.5px 28px;
		border: 0.5px solid #d1d5db;
		border-radius: 100px;
		font-size: 12.5px;
		font-family: inherit;
		color: var(--primary-dark-color);
		background: var(--primary-white-color);
		outline: none;
		width: 260px;
		transition: all 0.2s;
	}
	.overzicht-search:focus {
		border-color: var(--primary-blue-color);
	}
	.overzicht-lijst {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 400px;
		overflow-y: auto;
		scrollbar-color: var(--secondary-yellow-color) transparent;

		&:hover {
			scrollbar-color: var(--secondary-yellow-color) var(--secondary-broken-white-color);
		}
	}

	.overzicht-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		padding: 10px 1.25rem;
		border-bottom: 0.5px solid var(--secondary-border-blur-color);
		transition: all 0.2s;
	}
	.overzicht-item:last-child {
		border-bottom: none;
	}
	.overzicht-item:hover {
		background: var(--secondary-broken-white-color);
	}
	.overzicht-item-info {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 0;
	}
	.overzicht-item-naam {
		font-size: 15px;
		font-weight: 600;
		color: var(--primary-dark-color);
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 5px;
	}
	.overzicht-item-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-size: 11.5px;
		color: var(--secondary-lightgray-color);
	}
	.overzicht-item-meta i {
		font-size: 10px;
		color: var(--primary-blue-color);
	}
	.overzicht-badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 7.5px;
		border-radius: 100px;
	}
	.badge-zichtbaar {
		background: #dcfce7;
		color: #166534;
	}
	.badge-verborgen {
		background: #f3f4f6;
		color: var(--secondary-lightgray-color);
	}
	.overzicht-item-acties {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
	}
	.overzicht-btn-view,
	.overzicht-btn-edit,
	.overzicht-btn-delete {
		width: 32px;
		height: 32px;
		border-radius: 7.5px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		cursor: pointer;
		border: 0.5px solid transparent;
		transition: all 0.2s;
		text-decoration: none;
		background: none;
	}
	.overzicht-btn-view {
		background: var(--secondary-broken-white-color);
		color: var(--secondary-gray-color);
		border-color: var(--secondary-border-blur-color);
	}
	.overzicht-btn-view:hover {
		background: var(--primary-lightblue-color);
		color: var(--primary-blue-color);
		border-color: var(--primary-blue-color);
	}
	.overzicht-btn-edit {
		color: var(--primary-blue-color);
		border-color: var(--primary-blue-color);
	}
	.overzicht-btn-edit:hover {
		background: var(--primary-blue-color);
		color: #fff;
	}
	.overzicht-btn-delete {
		color: var(--secondary-gray-color);
	}
	.overzicht-btn-delete:hover {
		background: #fee2e2;
		color: var(--primary-red-color);
		border-color: #fca5a5;
	}
	.overzicht-geen {
		padding: 15px 1.25rem;
		font-size: 12.5px;
		color: var(--secondary-lightgray-color);
		margin: 0;
		font-style: italic;
	}
	.overzicht-leeg {
		padding: 18px 1.25rem;
		font-size: 15px;
		color: var(--secondary-lightgray-color);
		text-align: center;
		list-style: none;
	}

	.form-section {
		background: var(--primary-white-color);
		border: 0.5px solid var(--secondary-border-blur-color);
		border-radius: 15px;
		padding: 1.5rem;
		margin-bottom: 1.25rem;
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 2rem;
	}
	.form-section-label h3 {
		font-size: 15px;
		font-weight: 500;
		margin-bottom: 5px;
		color: var(--primary-dark-color);
	}
	.form-section-label p {
		font-size: 15px;
		color: var(--secondary-gray-color);
		line-height: 1.5;
	}
	.form-section-fields {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.field label {
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: var(--secondary-lightgray-color);
	}
	.field input,
	.field select {
		padding: 10px 15px;
		border: 0.5px solid #d1d5db;
		border-radius: 10px;
		font-size: 15px;
		color: var(--primary-dark-color);
		background: var(--primary-white-color);
		font-family: inherit;
		transition: all 0.2s;
	}
	.field input:focus,
	.field select:focus {
		outline: none;
		border-color: var(--primary-blue-color);
	}
	.field-full {
		width: 100%;
	}

	.form-footer {
		display: flex;
		align-items: center;
		padding-top: 1.25rem;
		border-top: 0.5px solid var(--secondary-border-blur-color);
		margin-bottom: 1.5rem;
	}
	.form-footer-actions {
		display: flex;
		gap: 10px;
	}
	.btn {
		padding: 10px 18px;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border: none;
		font-family: inherit;
		transition: all 0.2s;
	}
	.btn-primary {
		background: var(--primary-blue-color);
		color: #fff;
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--primary-darkblue-color);
	}
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.btn-ghost {
		background: transparent;
		color: var(--primary-red-color);
		border: 0.5px solid #fca5a5;
		font-size: 15px;
		padding: 10px 16px;
	}
	.btn-ghost:hover {
		background: #fee2e2;
	}
	.logout-wrap {
		padding-top: 0.5rem;
	}

	@media screen and (max-width: 700px) {
		.form-section {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.overzicht-blok-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.overzicht-search {
			width: 100%;
		}
		.beheer-main {
			padding: 1rem;
		}
	}
</style>
