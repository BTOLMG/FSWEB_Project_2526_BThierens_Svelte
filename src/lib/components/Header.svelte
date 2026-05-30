<!-- Navbar -->

<script>
	let { user } = $props();
	let menuOpen = $state(false);

	const href = user?.rol === 'actorbeheerder' ? '/account' : '/admin';
	const username = user?.email?.split('@')[0]?.split('.')[0] || 'User';

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<header>
	<nav class="navbar">
		<button class="navbar-toggler" onclick={toggleMenu} title="Toggle menu">
			<span></span>
		</button>

		<a href="/" class="navbar-title">De Sociale Kaart</a>

		<a href="/faq" class="navbar-item">Hulp</a>
		<a href="/about" class="navbar-item">Over ons</a>

		{#if user}
			<a class="profile-bar" {href}>
				<h1 class="profile-header">{username}</h1>
				<p class="profile-sub">{user.rol}</p>
			</a>
		{:else}
			<a href="/login" class="profile-btn">INLOGGEN</a>
		{/if}
	</nav>

	<div class="offcanvas" class:open={menuOpen}>
		<div class="offcanvas-header">
			{#if user}
				<a class="profile-bar" {href}>
					<h1 class="profile-header">{username}</h1>
					<p class="profile-sub">{user.rol}</p>
				</a>
			{:else}
				<a href="/login" class="profile-btn">INLOGGEN</a>
			{/if}
			<button id="closeMenuButton" onclick={closeMenu}>X</button>
		</div>
		<nav>
			<a class="nav-link" href="/" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-house"></i><p>Home</p>
			</a>
			<a class="nav-link" href="/search?zoekterm=Dringende medische hulpverlening" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-triangle-exclamation"></i><p>Noodgeval</p>
			</a>
			<a class="nav-link" href="/search?zoekterm=op-eigen-benen-staan" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-person-walking"></i><p>Op eigen benen staan</p>
			</a>
			<a class="nav-link" href="/search?zoekterm=Gezondheid" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-heart-pulse"></i><p>Mijn gezondheid</p>
			</a>
			<a class="nav-link" href="/search?zoekterm=mijn-rechten" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-gavel"></i><p>Mijn rechten</p>
			</a>
			<a class="nav-link" href="/search?zoekterm=klacht-indienen" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-comment-medical"></i><p>Klacht indienen</p>
			</a>
			<a class="nav-link" href="/kaart" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-location"></i><p>Kaart weergave</p>
			</a>
            <a class="nav-link" href="/favorites" onclick={closeMenu}>
				<i class="fa-fw fa-solid fa-star"></i><p>Opgeslagen hulp</p>
			</a>
		</nav>
		{#if user}
			<form method="POST" action="/logout" class="logout-form">
				<button type="submit" class="profile-btn uitloggen">UITLOGGEN</button>
			</form>
		{/if}
	</div>

	<!-- Overlay -->
	<button title="Close menu" class="overlay" class:show={menuOpen} onclick={closeMenu}></button>

</header>

<style>
	/* Navbar */
	:root {
		--padding-offcanvas: 1rem;
	}

	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 56px;
		background: var(--primary-white-color);
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		padding: 0 1rem;
		color: var(--primary-blue-color);
		z-index: 1000;
		box-shadow: 0px 20px 50px var(--secondary-border-blur-color);
	}

	header {
		height: 56px;
	}

	.navbar-title {
		text-decoration: none;
		color: var(--primary-blue-color);
		margin: 0 auto 0 1rem;
		font-weight: bold;
	}

	.navbar-toggler {
		background: none;
		border: none;
		cursor: pointer;
		width: 30px;
		height: 30px;
		position: relative;
	}

	.navbar-toggler span,
	.navbar-toggler span::before,
	.navbar-toggler span::after {
		display: block;
		background: var(--primary-blue-color);
		height: 3px;
		width: 100%;
		position: absolute;
		left: 0;
		transition: 0.3s;
	}

	.navbar-toggler span {
		top: 50%;
		transform: translateY(-50%);
	}

	.navbar-toggler span::before {
		content: '';
		top: -8px;
	}

	.navbar-toggler span::after {
		content: '';
		top: 8px;
	}

	/* Offcanvas menu */
	.offcanvas {
		position: fixed;
		top: 0;
		left: calc(-260px - 2 * var(--padding-offcanvas));
		width: 260px;
		height: 100%;
		background: var(--primary-white-color);
		color: #000000;
		box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
		transition: left 0.3s ease;
		padding: var(--padding-offcanvas);
		z-index: 2000;

		display: flex;
		flex-direction: column;
	}

	.offcanvas.open {
		left: 0;
	}

	.offcanvas-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 1rem 0 4rem 0;
	}

	.nav-link {
		padding: 0.5rem 0;
		color: var(--secondary-blue-text-color);
		text-decoration: none;
		font-weight: 550;
		padding-left: 20px;
		border-radius: 10px;
		height: 30px;
		margin-bottom: 5px;

		display: flex;
		align-items: center;
		gap: 10px;
	}

	.nav-link i {
		width: 30px;
		font-size: 25px;
	}

	.nav-link:hover p {
		text-decoration: underline;
	}

	.overlay {
		position: fixed;
		inset: 0;
		background-color: color-mix(in srgb, var(--secondary-gray-color) 15%, transparent);
		backdrop-filter: blur(1px);
		display: none;
		z-index: 999;
	}

	.overlay.show {
		display: block;
	}

	.offcanvas nav {
		flex-grow: 0.8;
	}

	.logout-form {
		margin-top: auto;
		width: 100%;
	}

	.profile-btn {
		width: auto;
		height: auto;
		padding: 10px 40px;
		border-radius: 20px;
		display: block;
		align-self: center;
		background-color: var(--primary-blue-color);
		border-width: 0;
		font-weight: 550;
		color: var(--primary-white-color);
		cursor: pointer;
		text-decoration: none;
	}

	.profile-bar {
		display: flex;
		flex-direction: column;
		gap: 0;
		background-color: var(--primary-lightblue-color);
		padding: 5px;
		border-radius: 10px;
		text-decoration: none;
		transition: all 0.2s;

		max-width: 130px;
		width: 130px;
		align-items: flex-end;
		overflow: auto;

		&:hover {
			filter: brightness(0.95);
			transform: translateY(-1px);
		}
	}
	.profile-header {
		margin: 0;
		padding: 0;
		color: var(--primary-darkblue-color);
		text-transform: uppercase;
		font-size: medium;
	}
	.profile-sub {
		margin: 0;
		color: var(--secondary-blue-text-color);
	}

	.uitloggen {
		width: 100%;
		background-color: var(--primary-red-color);

		&:hover {
			background-color: oklch(from var(--primary-red-color) calc(l * 0.8) c h);
		}
	}

	#closeMenuButton {
		width: 40px;
		height: 40px;
		border-width: 0;
		font-weight: bolder;
		font-size: x-large;
		color: var(--secondary-blue-text-color);
		background-color: transparent;
		cursor: pointer;
	}

	.navbar-item {
		color: var(--secondary-gray-color);
		text-decoration: none;
		font-weight: 500;
		margin-right: 2rem;
	}
	.navbar-item:hover {
		text-decoration: underline;
	}

	@media screen and (max-width: 550px) {
		.navbar-title {
			display: none;
		}

		.navbar-item {
			margin-right: 10px;
		}

		.navbar-toggler {
			margin-right: auto;
		}
	}

	@media screen and (max-width: 330px) {
		.navbar-item {
			margin-right: 5px;
		}
	}
</style>
