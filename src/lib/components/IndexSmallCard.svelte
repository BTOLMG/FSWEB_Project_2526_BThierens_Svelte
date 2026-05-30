<script lang="ts">
	interface Props {
		backgroundColor?: string;
		img?: string;
		imgColor?: string;
		imgBackgroundColor?: string;
		title?: string;
		description?: string;
		link?: string;
		titleTextColor?: string;
		descriptionTextColor?: string;
	}

	let {
		backgroundColor = 'var(--primary-white-color)',
		img = '',
		imgColor = 'var(--primary-white-color)',
		imgBackgroundColor = 'none',
		title = 'Titel',
		description = 'description',
		link = '#',
		titleTextColor = 'var(--secondary-gray-color)',
		descriptionTextColor = 'var(--secondary-blue-text-color)'
	}: Props = $props();
</script>

<a href={link} class="small-card-link" style="background-color: {backgroundColor}">
	<div class="small-card">
		{#if img}
			<div class="small-card-img" style="background-color: {imgBackgroundColor}">
				<i class={img} style="font-size: 30px; color: {imgColor}"></i>
			</div>
		{/if}
		<div class="small-card-content">
			<h3 style="color: {titleTextColor}">{title}</h3>
			<p style="color: {descriptionTextColor}">{description}</p>
		</div>
	</div>
</a>

<style>
	.small-card-link {
		transition: transform 0.2s ease-in-out, box-shadow 0.2s;
		cursor: pointer;
		background-color: white;
		border-radius: 15px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		padding: 20px;
		width: 32%;
		min-width: 300px;
		box-sizing: border-box;
		text-decoration: none;
	}

	.small-card-link:hover {
		transform: translateY(-3px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
	}

	.small-card {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: inherit;
		width: 100%;
		height: 100%;
	}

	.small-card-img {
		width: 60px;
		height: 60px;
		border-radius: 15px;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 20px;
		flex-shrink: 0;
	}

	.small-card-content {
		display: flex;
		flex-direction: column;
	}

	.small-card-content h3 {
		margin: 0 0 5px 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.small-card-content p {
		margin: 0;
		font-size: 0.9rem;
	}

	@media screen and (max-width: 1000px) {
		.small-card-link {
			width: 100%;
			min-width: auto;
			justify-content: flex-start;
		}
	}

	:global(.cards-grid) {
		position: relative;
		transform: translateY(-50px);
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		text-decoration: none;
		gap: 20px;
	}

	@media screen and (max-width: 1000px) {
		:global(.cards-grid) {
			justify-content: center;
		}
	}
</style>