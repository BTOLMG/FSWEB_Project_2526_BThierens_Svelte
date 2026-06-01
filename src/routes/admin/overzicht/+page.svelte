<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { createClient } from '@supabase/supabase-js';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

	let { data, form } = $props();
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

	let actorZoek = $state('');
	let userZoek = $state('');
	let statusMsg = $state('');

	const filteredActoren = $derived(
		actorZoek.trim()
			? data.actoren.filter((a: any) => {
					const t = actorZoek.toLowerCase();
					return (
						a.naam.toLowerCase().includes(t) ||
						a.gemeente.toLowerCase().includes(t) ||
						a.categorie.toLowerCase().includes(t) ||
						(a.beheerder ?? '').toLowerCase().includes(t)
					);
				})
			: data.actoren
	);

	const filteredUsers = $derived(
		userZoek.trim()
			? data.users.filter((u: any) => {
					const t = userZoek.toLowerCase();
					return u.email.toLowerCase().includes(t) || u.actoren.toLowerCase().includes(t);
				})
			: data.users
	);

	async function deleteActor(id: number, naam: string) {
		if (
			!confirm(
				`Ben je zeker dat je "${naam}" wil verwijderen? Dit kan niet ongedaan worden gemaakt.`
			)
		)
			return;
		const { error } = await supabase.from('actor').delete().eq('id', id);
		if (error) {
			alert('Fout: ' + error.message);
			return;
		}
		statusMsg = `Actor "${naam}" verwijderd.`;
		await invalidateAll();
	}

	async function logout() {
		const response = await fetch('/logout', { method: 'POST' });
		if (response.ok) {
			await invalidateAll();
			goto('/login');
		}
	}
</script>

<div class="layout">
	<main class="main">
		<div class="admin-tabs">
			<a href="/admin" class="admin-tab">
				<i class="fa fa-plus"></i> Nieuwe organisatie
			</a>
			<a href="/admin/overzicht" class="admin-tab active">
				<i class="fa fa-list"></i> Overzicht
			</a>
		</div>

		{#if statusMsg || form?.statusMsg}
			<div class="alert alert-success">
				<i class="fa fa-circle-check"></i>
				{form?.statusMsg ?? statusMsg}
			</div>
		{/if}

		<div class="overzicht-blok">
			<div class="overzicht-blok-header">
				<div>
					<h2 class="overzicht-blok-titel"><i class="fa fa-building"></i> Actoren</h2>
					<p class="overzicht-blok-sub">{data.actoren.length} actoren in de database</p>
				</div>
				<div class="overzicht-search-wrap">
					<i class="fa fa-search overzicht-search-icon"></i>
					<input
						type="text"
						class="overzicht-search"
						placeholder="Zoek op naam, gemeente of categorie…"
						bind:value={actorZoek}
					/>
				</div>
			</div>

			{#if filteredActoren.length === 0 && actorZoek}
				<p class="overzicht-geen">Geen actoren gevonden voor deze zoekterm.</p>
			{/if}

			<ul class="overzicht-lijst">
				{#each filteredActoren as actor (actor.id)}
					<li class="overzicht-item">
						<div class="overzicht-item-info">
							<div class="overzicht-item-naam">
								{actor.naam}
								{#if actor.isVisible}
									<span class="overzicht-badge badge-zichtbaar"
										><i class="fa fa-eye"></i> zichtbaar</span
									>
								{:else}
									<span class="overzicht-badge badge-verborgen"
										><i class="fa fa-eye-slash"></i> verborgen</span
									>
								{/if}
							</div>
							<div class="overzicht-item-meta">
								<span><i class="fa fa-tag"></i> {actor.categorie}</span>
								<span><i class="fa fa-location-dot"></i> {actor.gemeente}</span>
								{#if actor.beheerder}
									<span><i class="fa fa-user"></i> {actor.beheerder}</span>
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
							<button
								type="button"
								class="overzicht-btn-delete"
								title="Verwijder actor"
								onclick={() => deleteActor(actor.id, actor.naam)}
							>
								<i class="fa fa-trash"></i>
							</button>
						</div>
					</li>
				{:else}
					<li class="overzicht-leeg">Nog geen actoren in de database.</li>
				{/each}
			</ul>
		</div>

		<div class="overzicht-blok">
			<div class="overzicht-blok-header">
				<div>
					<h2 class="overzicht-blok-titel"><i class="fa fa-users"></i> Organisaties</h2>
					<p class="overzicht-blok-sub">{data.users.length} organisatie accounts</p>
				</div>
				<div class="overzicht-search-wrap">
					<i class="fa fa-search overzicht-search-icon"></i>
					<input
						type="text"
						class="overzicht-search"
						placeholder="Zoek op e-mail of organisatie"
						bind:value={userZoek}
					/>
				</div>
			</div>

			{#if filteredUsers.length === 0 && userZoek}
				<p class="overzicht-geen">Geen organisaties gevonden voor deze zoekterm.</p>
			{/if}

			<ul class="overzicht-lijst">
				{#each filteredUsers as user (user.id)}
					<li class="overzicht-item">
						<div class="overzicht-item-info">
							<div class="overzicht-item-naam">
								{user.email}
								<span
									class="overzicht-badge {user.rol === 'actorbeheerder'
										? 'badge-beheerder'
										: 'badge-default'}">{user.rol}</span
								>
							</div>
							<div class="overzicht-item-meta">
								<span><i class="fa fa-building"></i> {user.actoren}</span>
							</div>
						</div>
						<div class="overzicht-item-acties">
							<form
								method="POST"
								action="?/deleteUser"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="id" value={user.id} />
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button
									type="submit"
									class="overzicht-btn-delete"
									onclick={(e) => {
										if (!confirm(`Ben je zeker dat je "${user.email}" wil verwijderen?`)) {
											e.preventDefault();
										}
									}}
								>
									<i class="fa fa-trash"></i>
								</button>
							</form>
						</div>
					</li>
				{:else}
					<li class="overzicht-leeg">Nog geen organisaties in de database.</li>
				{/each}
			</ul>
		</div>

		<div class="logout-wrap">
			<button type="button" class="btn btn-ghost" onclick={logout}>
				<i class="fa fa-arrow-right-from-bracket"></i> Uitloggen
			</button>
		</div>
	</main>
</div>

<style>
	.layout {
		display: flex;
		justify-content: center;
		min-height: calc(100vh - 56px);
		background: var(--secondary-broken-white-color);
	}
	.main {
		padding: 2rem;
		width: 100%;
		max-width: 900px;
	}
	.admin-tabs {
		display: flex;
		gap: 5px;
		margin-bottom: 1.75rem;
		border-bottom: 1.5px solid var(--secondary-border-blur-color);
	}
	.admin-tab {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 10px 20px;
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
		color: var(--secondary-gray-color);
		border-radius: 8px 8px 0 0;
		border: 1.5px solid transparent;
		border-bottom: none;
		margin-bottom: -1.5px;
		transition: all 0.2s;
	}
	.admin-tab:hover {
		color: var(--primary-blue-color);
		background: var(--primary-lightblue-color);
	}
	.admin-tab.active {
		color: var(--primary-blue-color);
		background: var(--primary-white-color);
		border-color: var(--secondary-border-blur-color);
		border-bottom-color: var(--primary-white-color);
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
		gap: 5px;
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
		font-size: 11px;
		color: var(--secondary-lightgray-color);
		pointer-events: none;
	}
	.overzicht-search {
		padding: 10px 15px 10px 30px;
		border: 0.5px solid var(--secondary-broken-white-color);
		border-radius: 100px;
		font-size: 12.5px;
		font-family: inherit;
		color: var(--primary-dark-color);
		background: var(--primary-white-color);
		outline: none;
		width: 260px;
		transition: all 0.2s;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
	}
	.overzicht-search:focus {
		border-color: var(--primary-blue-color);
	}
	.overzicht-lijst {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 400px;
		overflow: auto;
		scrollbar-color: var(--secondary-yellow-color) transparent;
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
		gap: 6px;
	}
	.overzicht-item-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-size: 12.5px;
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
		padding: 5px 10px;
		border-radius: 100px;
	}
	.badge-zichtbaar {
		background: var(--error-succes-bgcolor);
		color: var(--error-succes-color);
	}
	.badge-verborgen {
		background: #f3f4f6;
		color: var(--secondary-lightgray-color);
	}
	.badge-beheerder {
		background: oklch(from var(--primary-blue-color) 0.93 calc(c * 0.18) h);
		color: var(--primary-blue-color);
	}
	.badge-default {
		background: #f3f4f6;
		color: var(--secondary-gray-color);
	}
	.overzicht-item-acties {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
	}
	.overzicht-btn-view,
	.overzicht-btn-delete {
		width: 30px;
		height: 30px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12.5px;
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
	.overzicht-btn-delete {
		color: var(--secondary-lightgray-color);
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
		padding: 20px 1.25rem;
		font-size: 15px;
		color: var(--secondary-lightgray-color);
		text-align: center;
		list-style: none;
	}
	.btn {
		padding: 10px 20px;
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
	.btn-ghost {
		background: transparent;
		color: var(--primary-red-color);
		border: 0.5px solid #fca5a5;
	}
	.btn-ghost:hover {
		background: #fee2e2;
	}
	.logout-wrap {
		padding-top: 0.5rem;
	}
	@media screen and (max-width: 700px) {
		.overzicht-blok-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.overzicht-search {
			width: 100%;
		}
		.main {
			padding: 1rem;
		}
	}
</style>
