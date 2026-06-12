<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const actor = data.actor;
	const getContact = (type: string) =>
		actor.contactgegevens?.find((c: { type: string }) => c.type === type)?.waarde ?? '';

	let publieke_naam = $state(actor.publieke_naam ?? '');
	let telefoonnr = $state(getContact('telefoonnr'));
	let mail = $state(getContact('mail'));
	let website = $state(getContact('online'));
	let straatnaam = $state(actor.straatnaam ?? '');
	let huisnummer = $state(actor.huisnummer ?? '');
	let busnummer = $state(actor.busnummer ?? '');
	let postcode = $state(actor.postcode ?? '');
	let gemeente = $state(actor.gemeente ?? '');
	let lat = $state(actor.lat?.toString() ?? '');
	let lon = $state(actor.lon?.toString() ?? '');
	let leeftijdscategorie = $state(actor.leeftijdscategorie ?? '');
	let leeftijd_min = $state(actor.leeftijd_min?.toString() ?? '');
	let leeftijd_max = $state(actor.leeftijd_max?.toString() ?? '');
	let aangeboden_diensten = $state(actor.aangeboden_diensten ?? '');
	let opmerkingen = $state(actor.opmerkingen ?? '');
	let betaalwijze = $state(actor.betaalwijze ?? '');
	let isVisible = $state(actor.isVisible ?? false);
	let password = $state('');
	let passwordConfirm = $state('');

	// svelte-ignore state_referenced_locally
	let geselecteerdeRubrieken = $state<string[]>(data.gekoppeldeIds.slice());
	let rubriekDropdownOpen = $state(false);
	let rubriekZoek = $state('');

	const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

	type DagUur = { open: boolean; van: string; tot: string };
	let openingsuren = $state<Record<string, DagUur>>(
		Object.fromEntries(
			DAGEN.map((dag) => {
				const uur = actor.openingsuren?.find(
					(u: { dag_van_de_week: string }) => u.dag_van_de_week === dag
				);
				return [
					dag,
					{
						open: !!uur,
						van: uur?.startuur?.slice(0, 5) ?? '',
						tot: uur?.einduur?.slice(0, 5) ?? ''
					}
				];
			})
		)
	);

	let saving = $state(false);
	let statusMsg = $state('');
	let errors = $state<string[]>([]);
	let geoStatus = $state('');
	let geoLoading = $state(false);

	const filteredRubrieken = $derived(
		rubriekZoek.trim()
			? data.alleRubrieken.filter((r: { naam: string }) =>
					r.naam.toLowerCase().includes(rubriekZoek.toLowerCase())
				)
			: data.alleRubrieken
	);

	function toggleRubriek(id: string) {
		if (geselecteerdeRubrieken.includes(id)) {
			geselecteerdeRubrieken = geselecteerdeRubrieken.filter((r) => r !== id);
		} else {
			geselecteerdeRubrieken.push(id);
		}
	}

	function removeRubriek(id: string) {
		geselecteerdeRubrieken = geselecteerdeRubrieken.filter((r) => r !== id);
	}

	function getRubriekNaam(id: string) {
		return data.alleRubrieken.find((r: { id: string }) => r.id === id)?.naam ?? id;
	}

	//https://www.youtube.com/watch?v=vOPr5k_SGVA
	async function geocode() {
		geoLoading = true;
		geoStatus = 'Coördinaten ophalen…';
		const query = [straatnaam, huisnummer, postcode, gemeente, 'België'].filter(Boolean).join(', ');
		try {
			fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
				.then(data => data.json())
				.then(data => {
					if (data.length === 0) {
						geoStatus = 'Adres niet gevonden.';
					} else {
						lat = parseFloat(data[0].lat).toFixed(6);
						lon = parseFloat(data[0].lon).toFixed(6);
						
						const status = data[0].display_name.split(',');
						geoStatus = status[0] + ',' + status[1] + ',' + status[2] + ',' + status[6];
					}
				});			
		} catch {
			geoStatus = 'Verbindingsfout.';
		}
		geoLoading = false;
	}

	async function save() {
		errors = [];
		if (!publieke_naam.trim()) {
			errors = ['Naam is verplicht.'];
			return;
		}
		if (password && password !== passwordConfirm) {
			errors = ['Wachtwoorden komen niet overeen.'];
			return;
		}
		if (password && password.length < 8) {
			errors = ['Wachtwoord moet minimaal 8 tekens zijn.'];
			return;
		}

		saving = true;
		statusMsg = '';

		for (const dag of DAGEN) {
			const uur = openingsuren[dag];
			if (uur.open && uur.van >= uur.tot) {
				errors = [`Eindtijd moet later zijn dan begintijd (${dag}).`];
				saving = false;
				return;
			}
		}

		const formData = new FormData();
		formData.append('publieke_naam', publieke_naam);
		formData.append('betaalwijze', betaalwijze);
		formData.append('leeftijdscategorie', leeftijdscategorie);
		formData.append('leeftijd_min', leeftijd_min);
		formData.append('leeftijd_max', leeftijd_max);
		formData.append('straatnaam', straatnaam);
		formData.append('huisnummer', huisnummer);
		formData.append('busnummer', busnummer);
		formData.append('gemeente', gemeente);
		formData.append('postcode', postcode);
		formData.append('lat', lat);
		formData.append('lon', lon);
		formData.append('aangeboden_diensten', aangeboden_diensten);
		formData.append('opmerkingen', opmerkingen);
		formData.append('isVisible', isVisible ? 'on' : 'off');
		formData.append('telefoonnr', telefoonnr);
		formData.append('mail', mail);
		formData.append('website', website);
		formData.append('rubrieken', JSON.stringify(geselecteerdeRubrieken));

		const openingsuurData = DAGEN.filter((dag) => openingsuren[dag].open).map((dag) => ({
			dag_van_de_week: dag,
			startuur: openingsuren[dag].van,
			einduur: openingsuren[dag].tot
		}));
		formData.append('openingsuren', JSON.stringify(openingsuurData));

		const response = await fetch('?/saveActor', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (!response.ok || result.error) {
			errors = [result.error || 'Fout bij opslaan'];
			saving = false;
			return;
		}

		statusMsg = 'Wijzigingen succesvol opgeslagen!';
		await invalidateAll();
		saving = false;
	}

	async function logout() {
		const response = await fetch('/logout', { method: 'POST' });
		if (response.ok) {
			await invalidateAll();
			goto('/login');
		}
	}
</script>

<div class="beheer-layout">
	<main class="beheer-main">
		<div class="beheer-header">
			<h1>Mijn Gegevens Bijwerken</h1>
			<p>
				Zorg ervoor dat jongeren en partners altijd over de meest actuele informatie beschikken.
			</p>
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

		<div class="form-section">
			<div class="form-section-label">
				<h3>Organisatie Profiel</h3>
				<p>Deze gegevens vormen de kern van je zichtbaarheid op de kaart.</p>
			</div>
			<div class="form-section-fields">
				<div class="field field-full">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Organisatienaam</label>
					<input type="text" bind:value={publieke_naam} />
				</div>
				<div class="field-row">
					<div class="field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Telefoon</label>
						<input type="text" bind:value={telefoonnr} placeholder="bijv. 02 123 45 67" />
					</div>
					<div class="field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Email</label>
						<input type="email" bind:value={mail} placeholder="info@organisatie.be" />
					</div>
				</div>
				<div class="field field-full">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Website</label>
					<div class="input-prefix-wrap">
						<i class="fa fa-link"></i>
						<input type="url" bind:value={website} placeholder="https://www.uworganisatie.be" />
					</div>
				</div>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Hoofdlocatie</h3>
				<p>Geef het adres op waar iedereen fysiek terecht kunnen.</p>
			</div>
			<div class="form-section-fields">
				<div class="field-row field-row-address">
					<div class="field field-grow">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Straatnaam</label>
						<input type="text" bind:value={straatnaam} placeholder="bijv. Kerkstraat" />
					</div>
					<div class="field field-narrow">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Nummer</label>
						<input type="text" bind:value={huisnummer} placeholder="12" />
					</div>
					<div class="field field-narrow">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Bus</label>
						<input type="text" bind:value={busnummer} placeholder="A" />
					</div>
				</div>
				<div class="field-row field-row-narrow">
					<div class="field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Postcode</label>
						<input type="text" bind:value={postcode} />
					</div>
					<div class="field field-grow">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Stad / Gemeente</label>
						<input type="text" bind:value={gemeente} />
					</div>
				</div>
				<div class="field-row">
					<div class="field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Breedtegraad (lat)</label>
						<input type="text" bind:value={lat} placeholder="bijv. 50.8503" />
					</div>
					<div class="field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Lengtegraad (lon)</label>
						<input type="text" bind:value={lon} placeholder="bijv. 4.3517" />
					</div>
				</div>
				<div class="geo-action-row">
					<button type="button" class="btn btn-geo" onclick={geocode} disabled={geoLoading}>
						<i class="fa fa-map-marker-alt"></i> Coördinaten automatisch ophalen
					</button>
					{#if geoStatus}<span class="geo-status">{geoStatus}</span>{/if}
				</div>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Doelgroep</h3>
				<p>Voor welke leeftijdsgroep is dit aanbod bedoeld?</p>
			</div>
			<div class="form-section-fields">
				<div class="field field-full">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Leeftijdscategorie</label>
					<select bind:value={leeftijdscategorie}>
						<option value="">— Selecteer een categorie —</option>
						{#each ['kinderen', 'jongeren', 'jongvolwassenen', 'volwassenen', 'ouderen'] as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
				</div>
				<div class="field-row field-row-ages">
					<div class="field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Minimumleeftijd</label>
						<div class="input-unit-wrap">
							<input type="number" bind:value={leeftijd_min} min="0" max="99" placeholder="0" />
							<span class="input-unit">jaar</span>
						</div>
					</div>
					<div class="field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label>Maximumleeftijd</label>
						<div class="input-unit-wrap">
							<input type="number" bind:value={leeftijd_max} min="0" max="99" placeholder="99" />
							<span class="input-unit">jaar</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Rubrieken</h3>
				<p>Selecteer de rubrieken die van toepassing zijn op jullie organisatie.</p>
			</div>
			<div class="form-section-fields">
				<div class="rubriek-chips">
					{#each geselecteerdeRubrieken as id}
						<span class="rubriek-chip">
							{getRubriekNaam(id)}
							<!-- svelte-ignore a11y_consider_explicit_label -->
							<button type="button" onclick={() => removeRubriek(id)}>
								<i class="fa fa-xmark"></i>
							</button>
						</span>
					{/each}
				</div>
				<div class="rubriek-dropdown-wrap">
					<button
						type="button"
						class="rubriek-dropdown-trigger"
						class:open={rubriekDropdownOpen}
						onclick={() => {
							rubriekDropdownOpen = !rubriekDropdownOpen;
							rubriekZoek = '';
						}}
					>
						<i class="fa fa-tag"></i>
						<span>Rubriek toevoegen…</span>
						<i class="fa fa-chevron-down"></i>
					</button>
					{#if rubriekDropdownOpen}
						<div class="rubriek-dropdown open">
							<div class="rubriek-zoek-wrap">
								<i class="fa fa-search"></i>
								<input type="text" bind:value={rubriekZoek} placeholder="Zoek rubriek…" />
							</div>
							<ul class="rubriek-lijst">
								{#each filteredRubrieken as rubriek}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<li
										class="rubriek-option"
										class:selected={geselecteerdeRubrieken.includes(rubriek.id)}
										onclick={() => toggleRubriek(rubriek.id)}
									>
										<span class="rubriek-option-check">
											<i class="fa fa-check"></i>
										</span>
										<span class="rubriek-option-naam">
											{'- '.repeat(rubriek.level - 1)}{rubriek.naam}
										</span>
									</li>
								{/each}
								{#if filteredRubrieken.length === 0}
									<p class="rubriek-geen">Geen overeenkomsten.</p>
								{/if}
							</ul>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Aangeboden Diensten</h3>
				<p>Beschrijf welke diensten of activiteiten je organisatie aanbiedt.</p>
			</div>
			<div class="form-section-fields">
				<div class="field field-full">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Diensten</label>
					<textarea
						bind:value={aangeboden_diensten}
						rows="4"
						placeholder="bijv. Huiswerkbegeleiding…"
					></textarea>
					<span class="field-hint">Scheiden met komma's of elke dienst op een nieuwe regel.</span>
				</div>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Opmerkingen</h3>
				<p>Eventuele aanvullende opmerkingen of notities over je organisatie.</p>
			</div>
			<div class="form-section-fields">
				<div class="field field-full">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Opmerkingen</label>
					<textarea bind:value={opmerkingen} rows="3" placeholder="bijv. Gesloten in augustus…"
					></textarea>
				</div>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Betaalwijze</h3>
				<p>Hoe wordt deelname betaald of gefinancierd?</p>
			</div>
			<div class="form-section-fields">
				<div class="radio-group">
					{#each [['gratis', 'Gratis'], ['sociaal tarief', 'Sociaal tarief'], ['online betaling', 'Online betaling']] as [val, label]}
						<label class="radio-option">
							<input type="radio" bind:group={betaalwijze} value={val} />
							<span class="radio-circle"></span>
							<span class="radio-label">{label}</span>
						</label>
					{/each}
				</div>
				<button
					type="button"
					class="btn btn-secondary"
					style="align-self:start;margin-top:4px"
					onclick={() => (betaalwijze = '')}
				>
					<i class="fa fa-xmark"></i> Wissen
				</button>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Openingsuren</h3>
				<p>Geef aan wanneer iedereen bij jullie terecht kunnen.</p>
			</div>
			<div class="form-section-fields">
				<div class="opening-grid">
					<span class="opening-head"></span>
					<span class="opening-head">Open?</span>
					<span class="opening-head">Van</span>
					<span class="opening-head">Tot</span>
					{#each DAGEN as dag}
						<span class="opening-dag">{dag.charAt(0).toUpperCase() + dag.slice(1)}</span>
						<label class="toggle opening-toggle">
							<input type="checkbox" bind:checked={openingsuren[dag].open} />
							<span class="toggle-track"><span class="toggle-thumb"></span></span>
						</label>
						<div class="field opening-time">
							<input
								type="time"
								bind:value={openingsuren[dag].van}
								disabled={!openingsuren[dag].open}
							/>
						</div>
						<div class="field opening-time">
							<input
								type="time"
								bind:value={openingsuren[dag].tot}
								disabled={!openingsuren[dag].open}
							/>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="form-section">
			<div class="form-section-label">
				<h3>Login Gegevens</h3>
				<p>Laat leeg om je huidige wachtwoord te behouden.</p>
			</div>
			<div class="form-section-fields">
				<div class="field field-full">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Email (kan niet worden gewijzigd)</label>
					<input type="email" value={data.user.email} disabled />
				</div>
				<div class="field">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Nieuw Wachtwoord</label>
					<input type="password" bind:value={password} placeholder="Minimaal 8 tekens" />
				</div>
				<div class="field">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Bevestig Nieuw Wachtwoord</label>
					<input type="password" bind:value={passwordConfirm} placeholder="Herhaal wachtwoord" />
				</div>
			</div>
		</div>

		<div class="form-section visibility-section">
			<div class="form-section-label">
				<h3>Zichtbaarheid</h3>
				<p>Bepaal of jouw organisatie zichtbaar is voor bezoekers.</p>
			</div>
			<div class="form-section-fields" style="justify-content:center">
				<div class="field">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label>Online tonen</label>
					<div style="display:flex;align-items:center;gap:12px;margin-top:4px">
						<label class="toggle">
							<input type="checkbox" bind:checked={isVisible} />
							<span class="toggle-track"><span class="toggle-thumb"></span></span>
						</label>
						<span
							style="font-size:13px;font-weight:600;color:{isVisible
								? '#16a34a'
								: 'var(--secondary-lightgray-color)'}"
						>
							{isVisible ? 'Zichtbaar voor bezoekers' : 'Verborgen voor bezoekers'}
						</span>
					</div>
					<p class="field-hint">
						Zet dit uit als jullie gegevens tijdelijk niet getoond mogen worden.
					</p>
				</div>
			</div>
		</div>

		<div class="form-footer">
			{#if actor.last_updated}
				<div class="form-footer-meta">
					<span class="status-dot"></span>
					Laatst bijgewerkt op {new Date(actor.last_updated).toLocaleDateString('nl-BE')}
				</div>
			{/if}
			<div class="form-footer-actions">
				<a href="/account" class="btn btn-secondary">Annuleren</a>
				<button type="button" class="btn btn-primary" onclick={save} disabled={saving}>
					{saving ? 'Opslaan…' : 'Opslaan'}
				</button>
			</div>
		</div>

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
	}
	.alert-success {
		background: var(--error-succes-bgcolor);
		color: var(--error-succes-color);
	}
	.alert-error {
		background: var(--error-fail-bgcolor);
		color: var(--error-fail-color);
	}
	.alert-error ul {
		margin: 0;
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
	.visibility-section {
		border: 1.5px solid var(--primary-blue-color);
		background: oklch(from var(--primary-blue-color) 0.97 calc(c * 0.08) h);
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
	.field textarea,
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
	.field textarea:focus,
	.field select:focus {
		outline: none;
		border-color: var(--primary-blue-color);
	}
	.field input:disabled {
		background: var(--secondary-border-blur-color);
		color: var(--secondary-lightgray-color);
		cursor: not-allowed;
	}
	.field textarea {
		resize: vertical;
	}
	.field-full {
		width: 100%;
	}
	.field-grow {
		flex: 1;
	}
	.field-narrow {
		width: 80px;
		flex-shrink: 0;
	}
	.field-hint {
		font-size: 10px;
		color: var(--secondary-lightgray-color);
		line-height: 1.4;
	}
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
		align-items: start;
	}
	.field-row-narrow {
		grid-template-columns: 120px 1fr;
	}
	.field-row-address {
		grid-template-columns: 1fr 80px 80px;
	}
	.field-row-ages {
		grid-template-columns: 1fr 1fr;
		max-width: 320px;
	}

	.input-prefix-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}
	.input-prefix-wrap i {
		position: absolute;
		left: 10px;
		font-size: 15px;
		color: var(--secondary-lightgray-color);
		pointer-events: none;
	}
	.input-prefix-wrap input {
		padding-left: 30px;
		width: 100%;
	}
	.input-unit-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}
	.input-unit-wrap input {
		width: 100%;
		padding-right: 40px;
	}
	.input-unit {
		position: absolute;
		right: 10px;
		font-size: 10px;
		color: var(--secondary-lightgray-color);
		pointer-events: none;
	}

	.geo-action-row {
		display: flex;
		align-items: center;
		gap: 15px;
		flex-wrap: wrap;
	}
	.btn-geo {
		padding: 10px 15px;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		border: 0.5px solid var(--primary-blue-color);
		background: transparent;
		color: var(--primary-blue-color);
		font-family: inherit;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		transition: all 0.2s;
	}
	.btn-geo:hover:not(:disabled) {
		background: var(--primary-blue-color);
		color: white;
	}
	.btn-geo:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.geo-status {
		font-size: 13px;
		color: var(--secondary-gray-color);
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.radio-option {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		user-select: none;
	}
	.radio-option input[type='radio'] {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}
	.radio-circle {
		width: 16px;
		height: 16px;
		border: 0.5px solid #d1d5db;
		border-radius: 50%;
		background: var(--primary-white-color);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.radio-option input:checked + .radio-circle {
		border-color: var(--primary-blue-color);
	}
	.radio-option input:checked + .radio-circle::after {
		content: '';
		display: block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--primary-blue-color);
	}
	.radio-label {
		font-size: 15px;
		color: var(--primary-dark-color);
	}

	.toggle {
		position: relative;
		width: 40px;
		height: 22px;
		display: inline-block;
		flex-shrink: 0;
	}
	.toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}
	.toggle-track {
		position: absolute;
		inset: 0;
		background: #d1d5db;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.toggle-thumb {
		position: absolute;
		width: 18px;
		height: 18px;
		left: 2px;
		bottom: 2px;
		background: #fff;
		border-radius: 50%;
		transition: all 0.2s;
		display: block;
	}
	.toggle input:checked + .toggle-track {
		background: var(--primary-blue-color);
	}
	.toggle input:checked + .toggle-track .toggle-thumb {
		transform: translateX(18px);
	}

	.opening-grid {
		display: grid;
		grid-template-columns: 110px 60px 1fr 1fr;
		gap: 10px 15px;
		align-items: center;
	}
	.opening-head {
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: var(--secondary-lightgray-color);
		padding-bottom: 5px;
		border-bottom: 0.5px solid var(--secondary-border-blur-color);
	}
	.opening-dag {
		font-size: 15px;
		color: var(--primary-dark-color);
		font-weight: 500;
	}
	.opening-toggle {
		justify-self: start;
	}
	.opening-time input {
		width: 100%;
		padding: 7.5px 10px;
		border: 0.5px solid #d1d5db;
		border-radius: 10px;
		font-size: 15px;
		font-family: inherit;
		transition: all 0.2s;
	}
	.opening-time input:disabled {
		background: var(--secondary-border-blur-color);
		color: var(--secondary-lightgray-color);
		cursor: not-allowed;
		border-color: transparent;
	}

	.rubriek-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		min-height: 10px;
	}
	.rubriek-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background-color: var(--primary-lightblue-color);
		color: var(--primary-darkblue-color);
		border: 1px solid var(--primary-blue-color);
		border-radius: 20px;
		padding: 5px 10px 5px 15px;
		font-size: 15px;
		font-weight: 600;
	}
	.rubriek-chip button {
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
		opacity: 0.6;
		padding: 0;
		font-size: 10px;
		transition: all 0.2s;
	}
	.rubriek-chip button:hover {
		opacity: 1;
	}
	.rubriek-dropdown-wrap {
		position: relative;
	}
	.rubriek-dropdown-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 15px;
		border: 0.5px solid #d1d5db;
		border-radius: 10px;
		background: var(--primary-white-color);
		font-size: 15px;
		color: var(--secondary-lightgray-color);
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		transition: all 0.2s;
	}
	.rubriek-dropdown-trigger:hover,
	.rubriek-dropdown-trigger.open {
		border-color: var(--primary-blue-color);
		color: var(--primary-dark-color);
	}
	.rubriek-dropdown-trigger i:last-child {
		margin-left: auto;
		font-size: 10px;
		transition: all 0.2s;
	}
	.rubriek-dropdown-trigger.open i:last-child {
		transform: rotate(180deg);
	}
	.rubriek-dropdown {
		position: absolute;
		top: calc(100% + 5px);
		left: 0;
		right: 0;
		background: var(--primary-white-color);
		border: 0.5px solid #d1d5db;
		border-radius: 10px;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.1);
		z-index: 100;
		overflow: hidden;
	}
	.rubriek-zoek-wrap {
		position: relative;
		padding: 10px;
		border-bottom: 0.5px solid var(--secondary-border-blur-color);
	}
	.rubriek-zoek-wrap i {
		position: absolute;
		left: 18px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 10px;
		color: var(--secondary-lightgray-color);
		pointer-events: none;
	}
	.rubriek-zoek-wrap input {
		width: 100%;
		padding: 7.5px 10px 7.5px 28px;
		border: 0.5px solid var(--secondary-border-blur-color);
		border-radius: 5px;
		font-size: 15px;
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}
	.rubriek-lijst {
		list-style: none;
		margin: 0;
		padding: 5px 0;
		max-height: 220px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--secondary-yellow-color) transparent;
	}
	.rubriek-option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7.5px 15px;
		font-size: 15px;
		cursor: pointer;
		color: var(--primary-dark-color);
		transition: all 0.2s;
	}
	.rubriek-option:hover {
		background-color: var(--primary-lightblue-color);
	}
	.rubriek-option.selected {
		color: var(--primary-blue-color);
		font-weight: 600;
	}
	.rubriek-option-check {
		width: 15px;
		height: 15px;
		border: 1.5px solid #d1d5db;
		border-radius: 5px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.2s;
	}
	.rubriek-option-check i {
		font-size: 10px;
		color: transparent;
	}
	.rubriek-option.selected .rubriek-option-check {
		background: var(--primary-blue-color);
		border-color: var(--primary-blue-color);
	}
	.rubriek-option.selected .rubriek-option-check i {
		color: #fff;
	}
	.rubriek-geen {
		padding: 10px 15px;
		font-size: 15px;
		color: var(--secondary-lightgray-color);
		margin: 0;
	}

	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1.25rem;
		border-top: 0.5px solid var(--secondary-border-blur-color);
		margin-bottom: 1.5rem;
	}
	.form-footer-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 15px;
		color: var(--secondary-gray-color);
	}
	.status-dot {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #16a34a;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-size: 10px;
		flex-shrink: 0;
	}
	.status-dot::after {
		content: '✓';
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
	.btn-secondary {
		background: transparent;
		color: var(--secondary-gray-color);
		border: 0.5px solid #d1d5db;
	}
	.btn-secondary:hover {
		background: var(--secondary-border-blur-color);
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
		.field-row {
			grid-template-columns: 1fr;
		}
		.field-row-address {
			grid-template-columns: 1fr;
		}
		.beheer-main {
			padding: 1rem;
		}
		.opening-grid {
			grid-template-columns: 90px 50px 1fr 1fr;
			gap: 8px;
		}
	}
</style>
