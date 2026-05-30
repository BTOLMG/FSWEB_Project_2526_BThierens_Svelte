<script lang="ts">
	interface Props {
		class?: string;
		title?: string;
		description?: string;
		icon?: string;
		iconColor?: string;
		backgroundColor?: string;
		titleColor?: string;
		link?: string;
		children?: import('svelte').Snippet;
	}

	let {
		class: extraClass = '',
		title = '',
		description = '',
		icon = '',
		iconColor = 'var(--primary-white-color)',
		backgroundColor = 'white',
		titleColor = 'var(--primary-darkblue-color)',
		link = '#',
		children
	}: Props = $props();
</script>

<a href={link} class="big-card {extraClass}" style="background-color: {backgroundColor}">
	<div>
		{#if icon}
			<i class={icon} style="font-size: 50px; color: {iconColor}"></i>
		{/if}
		<h2 style="color: {titleColor}">{title}</h2>
		<p style="color: {titleColor}; opacity: 0.8;">{description}</p>
	</div>

	{#if children}
		{@render children()}
	{/if}
</a>

<style>
	.big-card {
		border-radius: 24px;
		padding: 30px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		text-decoration: none;
		transition: transform 0.2s;
	}

	.big-card:hover {
		transform: translateY(-5px);
	}

	:global(.big-cards-grid) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: auto auto;
		gap: 20px;
		padding: 20px;
		max-width: 1200px;
		margin: 0 auto;
	}

	:global(.card-noodgeval) {
		grid-row: span 2;
		background-color: var(--primary-red-color);
		color: var(--primary-white-color);
	}

	:global(.card-groot) {
		grid-column: span 2;
		background-color: var(--primary-creme-color);
		position: relative;
		overflow: hidden;
	}

	:global(.tag) {
		background-color: var(--secondary-border-blur-color);
		color: var(--secondary-gray-color);
		padding: 5px 10px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: bold;
		display: inline-block;
	}

	@media screen and (max-width: 1000px) {
		:global(.big-cards-grid) {
			grid-template-columns: 1fr;
			grid-template-rows: auto;
			justify-content: center;
		}
		:global(.card-noodgeval) {
			grid-row: auto;
		}
		:global(.card-groot) {
			grid-column: auto;
		}
	}
</style>