<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let statusMsg = $state('');
	let errors = $state<string[]>([]);
	let saving = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errors = [];
		statusMsg = '';
		saving = true;

		const formData = new FormData();
		formData.append('email', email);
		formData.append('password', password);
		formData.append('passwordConfirm', passwordConfirm);

		try {
			const response = await fetch('?/createOrganisatie', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			console.log('Response:', result);

			if (response.ok && result.type === 'success') {
				statusMsg = 'Nieuwe organisatie succesvol aangemaakt!';
				email = '';
				password = '';
				passwordConfirm = '';
			} else {
				errors = ['Er is een fout opgetreden: ' + JSON.stringify(result)];
			}
		} catch (error) {
			errors = ['Er is iets mis gegaan: ' + error];
			console.error('Error:', error);
		} finally {
			saving = false;
		}
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
			<a href="/admin" class="admin-tab active">
				<i class="fa fa-plus"></i> Nieuwe organisatie
			</a>
			<a href="/admin/overzicht" class="admin-tab">
				<i class="fa fa-list"></i> Overzicht
			</a>
		</div>

		<div class="header">
			<h1>Nieuwe organisatie aanmaken</h1>
			<p>Voeg een nieuwe organisatie toe aan de sociale kaart.</p>
		</div>

		{#if statusMsg}
			<div class="alert alert-success">{statusMsg}</div>
		{/if}
		{#if errors.length > 0}
			<div class="alert alert-error">
				<ul>
					{#each errors as e}<li>{e}</li>{/each}
				</ul>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="form-wrapper">
			<div class="form-section">
				<div class="form-section-label">
					<h3>Login Gegevens</h3>
					<p>De beheerder van deze organisatie kan inloggen met deze gegevens.</p>
				</div>
				<div class="form-section-fields">
					<div class="field field-full">
						<label for="email">E-mailadres</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="naam@organisatie.be"
							required
						/>
					</div>
					<div class="field-row">
						<div class="field">
							<label for="password">Wachtwoord</label>
							<input
								id="password"
								type="password"
								bind:value={password}
								placeholder="Minimaal 8 tekens"
								required
							/>
						</div>
						<div class="field">
							<label for="passwordConfirm">Bevestig Wachtwoord</label>
							<input
								id="passwordConfirm"
								type="password"
								bind:value={passwordConfirm}
								placeholder="Herhaal wachtwoord"
								required
							/>
						</div>
					</div>
				</div>
			</div>

			<div class="form-footer">
				<div class="form-footer-actions">
					<button type="submit" class="btn btn-primary" disabled={saving}>
						<i class="fa fa-plus"></i>
						{saving ? 'Bezig…' : 'Organisatie aanmaken'}
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
	.header {
		margin-bottom: 1.25rem;
	}
	.header h1 {
		font-size: 25px;
		font-weight: 500;
		margin-bottom: 5px;
		color: var(--primary-dark-color);
	}
	.header p {
		font-size: 15px;
		color: var(--secondary-gray-color);
	}
	.admin-tabs {
		display: flex;
		gap: 5px;
		margin-bottom: 1.75rem;
		border-bottom: 1.5px solid var(--secondary-border-blur-color);
		padding-bottom: 0;
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
	}
	.alert-success {
		background: var(--error-succes-bgcolor);
		color: var(--error-succes-color);
	}
	.alert-error {
		background: var(--error-fail-bgcolor);
		color: var(--error-fail-color);
		display: block;
	}
	.alert-error ul {
		margin: 5px 0 0;
		padding-left: 1.25rem;
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
		font-size: 12.5px;
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
	.field input {
		padding: 10px 15px;
		border: 0.5px solid #d1d5db;
		border-radius: 10px;
		font-size: 15px;
		color: var(--primary-dark-color);
		background: var(--primary-white-color);
		font-family: inherit;
		transition: all 0.2s;
	}
	.field input:focus {
		outline: none;
		border-color: var(--primary-blue-color);
	}
	.field-full {
		width: 100%;
	}
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
		align-items: start;
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
		.main {
			padding: 1rem;
		}
		.field-row {
			grid-template-columns: 1fr;
		}
	}
</style>
