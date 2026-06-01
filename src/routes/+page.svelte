<script lang="ts">
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import IndexSmallCard from '$lib/components/IndexSmallCard.svelte';
	import IndexBigCard from '$lib/components/IndexBigCard.svelte';

    import searchImg from '$lib/assets/search-icon.png';
    
	let inputValue = $state('');
	let inputBox: HTMLTextAreaElement;

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			const form = inputBox.closest('form');
			if (form) form.submit();
		}
	}
</script>

<div class="banner">
	<h1>Hoe kunnen we je helpen?</h1>
	<form action="/search" method="GET" class="search-form">
		<div class="search-wrapper">
			<img src={searchImg} alt="Search Icon" class="search-icon" />

			<textarea
				bind:this={inputBox}
				bind:value={inputValue}
				id="input-box"
				name="zoekterm"
				placeholder="Zoek een organisatie, hulpmiddel of thema..."
				onkeydown={handleKeyDown}
			></textarea>

			<button type="submit">ZOEKEN</button>
		</div>

		<SearchAutocomplete bind:inputValue />
	</form>
</div>

<div class="spacer-from-side spacer-from-bottom">
	<div class="cards-grid">
		<IndexSmallCard
			img="fa-solid fa-location-dot"
			imgColor="oklch(from var(--primary-blue-color) calc(l * 0.8) c h)"
			imgBackgroundColor="oklch(from var(--primary-blue-color) 0.9 calc(c * 0.25) calc(h - 8))"
			title="Kijk op de kaart"
			description="Vind diensten op een kaart en zie hoe dichtbij ze zijn"
			link="/kaart"
		/>

		<IndexSmallCard
			imgBackgroundColor="var(--secondary-yellow-color)"
			imgColor="oklch(from var(--secondary-yellow-color) calc(l * 0.6) c h)"
			img="fa-solid fa-star"
			title="Favorieten"
			description="Bekijk je bewaarde hulpmiddelen"
			link="/favorites"
		/>

		<IndexSmallCard
			backgroundColor="#fef2f2"
			imgBackgroundColor="var(--primary-red-color)"
			img="fa-solid fa-star-of-life"
			title="Dringende hulpverlening"
			description="Onmiddellijke hulp nodig?"
			titleTextColor="oklch(from var(--primary-red-color) 0.30 calc(c * 0.8) calc(h + 2))"
			descriptionTextColor="var(--primary-red-color)"
			link="/search?zoekterm=Dringende medische hulpverlening"
		/>
	</div>

	<h2>Ontdek per thema</h2>
	<hr class="small-yellow-line" />

	<div class="big-cards-grid">
		<IndexBigCard
			class="card-noodgeval"
			title="Ik heb dringende hulp nodig"
			titleColor="white"
			backgroundColor="var(--primary-red-color)"
			description="Weet waar je terecht kan voor dringende medische hulpverlening en andere noodsituaties."
			icon="fa-solid fa-triangle-exclamation"
			link="/search?zoekterm=Dringende medische hulpverlening"
		>
			<div class="card-footer">
				<strong>DIRECT HULP &rarr;</strong>
			</div>
		</IndexBigCard>

		<IndexBigCard
			class="card-groot"
			title="Ik wil op eigen benen staan"
			description="Alles over wonen, budget en zelfstandigheid voor jongeren."
			backgroundColor="var(--secondary-broken-white-color)"
			icon="fa-solid fa-person-walking"
			iconColor="var(--primary-darkblue-color)"
			link="/search?zoekterm=op-eigen-benen-staan"
		>
			<div class="tags">
				<span class="tag">WONEN</span>
				<span class="tag">GELD</span>
			</div>
		</IndexBigCard>

		<IndexBigCard
			title="Mijn gezondheid"
			description="Fysiek, mentaal en alles daartussenin."
			backgroundColor="oklch(from var(--primary-blue-color) 0.9 calc(c * 0.25) calc(h - 8))"
			icon="fa-solid fa-heart-pulse"
			iconColor="oklch(from var(--primary-blue-color) calc(l * 0.8) c h)"
			titleColor="var(--primary-darkblue-color)"
			link="/search?zoekterm=gezondheid"
		/>

		<IndexBigCard
			title="Mijn rechten"
			description="Ken je rechten als jongere in Vlaanderen."
			backgroundColor="var(--secondary-yellow-color)"
			titleColor="oklch(from var(--secondary-yellow-color) calc(l * 0.6) c h)"
			icon="fa-solid fa-gavel"
			iconColor="oklch(from var(--secondary-yellow-color) calc(l * 0.6) c h)"
			link="/search?zoekterm=mijn-rechten"
		/>

		<IndexBigCard
			class="card-groot"
			title="Zie uw opgeslagen hulp"
			description="Bekijk je bewaarde hulpmiddelen"
			backgroundColor="var(--secondary-lightyellow-color)"
			icon="fa-solid fa-star"
			titleColor="var(--primary-dark-color)"
			iconColor="var(--primary-dark-color)"
			link="/favorites"
		/>

		<IndexBigCard
			title="Ik wil een klacht indienen"
			description="Weet waar je terecht kan met je verhaal."
			backgroundColor="white"
			icon="fa-solid fa-comment-medical"
			iconColor="var(--primary-dark-color)"
			titleColor="var(--primary-dark-color)"
			link="/search?zoekterm=klacht-indienen"
		/>
	</div>
</div>

<style>
    .search-icon {
        margin-right: 15px;
        flex-shrink: 0;
        max-width: 25px;
        height: auto;
    }
	.banner {
		background: linear-gradient(to left, var(--primary-blue-color), var(--primary-lightdarkblue-color));
		color: var(--primary-white-color);
		min-height: 50vh;
		width: auto;
		text-align: center;
	}

	h1 {
		font-size: 4rem;
		font-weight: bold;
		margin-top: 5rem;
		margin-bottom: 0.5rem;
	}

	h2 {
		font-size: 2.5rem;
		margin-bottom: 0;
		font-weight: 550;
	}

	.small-yellow-line {
		margin: 5px 0 20px 0;
		width: 120px;
		height: 6px;
		background-color: var(--secondary-yellow-color);
		border: 0;
	}

	.spacer-from-side {
		padding: 0 2rem;
	}

	.spacer-from-bottom {
		margin-bottom: 8rem;
	}

	.card-footer {
		color: var(--primary-white-color);
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	@media screen and (max-width: 850px) {
        .search-icon {
            max-width: 20px;
            margin-right: 10px;
        }

		h1 {
			font-size: 2.5rem;
			margin-top: 3rem;
		}

		.banner {
			min-height: 40vh;
		}
	}

	@media screen and (max-width: 550px) {
		h1 {
			font-size: 6vw;
			margin-top: 2rem;
			padding: 20px;
		}

		.banner {
			min-height: 30vh;
		}
	}

    .search-form {
        padding: 40px 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

	.search-wrapper {
		background-color: var(--primary-white-color);
		display: flex;
		align-items: center;
		padding: 8px 10px 8px 15px;
		border-radius: 100px;
		width: 80%;
        max-width: 700px;

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
</style>