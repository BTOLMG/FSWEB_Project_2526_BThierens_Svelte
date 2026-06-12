<script lang="ts">
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

	interface Props {
		inputValue?: string;
	}

	let { inputValue = $bindable('') }: Props = $props();

	let resultBox: HTMLDivElement;
	let searchWrapper: HTMLDivElement | null = null;
	let keywords: string[] = [];

	onMount(async () => {
		try {
			const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

			const [{ data: actoren }, { data: diensten }, { data: rubrieken }, { data: categorieen }] =
				await Promise.all([
					supabase.from('actor').select('publieke_naam').eq('isVisible', true),
					supabase.from('actor').select('aangeboden_diensten').eq('isVisible', true),
					supabase.from('rubriek').select('naam'),
					supabase.from('categorie').select('naam')
				]);

			const keywordsSet = new Set<string>();

			for (const a of actoren ?? []) keywordsSet.add(a.publieke_naam);
			for (const a of diensten ?? []) keywordsSet.add(a.aangeboden_diensten);
			for (const r of rubrieken ?? []) keywordsSet.add(r.naam);
			for (const c of categorieen ?? []) keywordsSet.add(c.naam);

			keywords = Array.from(keywordsSet);

			searchWrapper = document.querySelector('.search-wrapper');
		} catch (error) {
			console.error('mislukt om de keywords op te halen:', error);
		}
	});

	let results: { name: string; relevance: number }[] = $derived(
		inputValue.length === 0
			? []
			: (() => {
					const input = inputValue.trim().toLowerCase();
					const scored: { name: string; relevance: number }[] = [];

					for (const item of keywords) {
						const lowerItem = item.toLowerCase();
						let score = 0;
						if (lowerItem.startsWith(input)) score += 2;
						else if (lowerItem.includes(input)) score += 1;
						if (score > 0) scored.push({ name: item, relevance: score });
					}

					scored.sort((a, b) => b.relevance - a.relevance);

					return scored.slice(0, 15);
				})()
	);

	$effect(() => {
		if (!resultBox) return;
		resultBox.classList.toggle('has-scrollbar', results.length > 6);
		searchWrapper?.classList.toggle('no-box-shadow', results.length > 0);
	});

	function selectResult(item: string) {
		inputValue = item;
		searchWrapper?.classList.remove('no-box-shadow');
	}

	function highlightMatch(text: string, searchTerm: string): string {
		const lowerText = text.toLowerCase();
		const lowerSearch = searchTerm.toLowerCase();
		const index = lowerText.indexOf(lowerSearch);

		if (index === -1) return text;

		return (
			text.slice(0, index) +
			'<b>' + text.slice(index, index + searchTerm.length) + '</b>' +
			text.slice(index + searchTerm.length)
		);
	}
</script>

<div class="result-box" bind:this={resultBox}>
	{#if results.length > 0}
		<ul>
			{#each results as result (result.name)}
				<li>
					<button type="button" onclick={() => selectResult(result.name)}>
						{@html highlightMatch(result.name, inputValue.trim())}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.result-box ul li button {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		font: inherit;
		color: inherit;
	}
	.result-box {
		width: 100%;
		max-width: 735px;
		justify-content: center;
		margin-bottom: 5vh;
		display: flex;
		box-shadow: 0 -30px 0 0 var(--primary-white-color);
	}

	.result-box ul {
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
		background-color: var(--primary-white-color);
		color: var(--primary-dark-color);
		border-radius: 0 0 2rem 2rem;
		margin: 0;
		padding: 0;
		list-style: none;
		text-align: left;
		width: 100%;
		max-height: 310px;
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-color: var(--secondary-yellow-color) transparent;
	}

	.result-box ul:hover {
		scrollbar-color: oklch(from var(--secondary-yellow-color) calc(l * 0.95) c h) transparent;
	}

	.result-box ul li {
		padding: 15px 10px 15px 30px;
		cursor: pointer;
		border-top: 1px solid oklch(from var(--secondary-lightgray-color) calc(l * 1.2) c h);
		border-radius: 3px;
		transition: background-color 0.15s;
	}

	.result-box ul li:hover {
		background-color: var(--primary-lightblue-color);
	}

	.result-box :global(b) {
		color: var(--primary-blue-color);
		font-weight: 700;
	}

	@media screen and (max-width: 850px) {
		.result-box {
			width: calc(100% + 35px);
		}
	}
</style>