<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>De Sociale Kaart</title>

	<!-- FONT -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
		rel="stylesheet"
	/>

	<!-- Icons from FontAwesome -->
	<script src="https://kit.fontawesome.com/ed9e8c8a7a.js" crossorigin="anonymous"></script>
</svelte:head>

<Header user={$page.data.user} />

{@render children()}

<Footer />

<style>
	:global(:root) {
		--primary-white-color: #fffefe;
		--primary-creme-color: #fcf9f7;
		--secondary-border-blur-color: #f2efed;
		--secondary-broken-white-color: #f8f4f0;
		--primary-red-color: #dc2626;
		--primary-blue-color: #0055cc;
		--primary-lightblue-color: #dae2ff;
		--secondary-yellow-color: #ffed00;
		--secondary-lightyellow-color: #fef9c3;
		--secondary-darkyellow-color: #686000;
		--primary-dark-color: #1b1c1b;
		--secondary-gray-color: #333332;
		--secondary-lightgray-color: #b1b1b6;
		--secondary-blue-text-color: #334155;

		--primary-darkblue-color: #02428b;
		--primary-lightdarkblue-color: #0454b1;

		--error-succes-color: #166534;
		--error-succes-bgcolor: #dcfce7;

		--error-fail-color: #fee2e2;
		--error-fail-bgcolor: #991b1b;
	}

	:global(*) {
		font-family: 'Inter', sans-serif;
		font-optical-sizing: auto;
		font-style: normal;
	}

	:global(body) {
		margin: 0;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--primary-creme-color);
		color: var(--primary-dark-color);
	}
</style>