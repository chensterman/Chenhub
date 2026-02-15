<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import logoLight from '$lib/assets/logo-light.png';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';

	let { data, children } = $props();

	const siteUrl = 'https://www.chenhub.love';
	const ogTitle = "Leon & Kelsey's shared hub";
	const ogDescription = 'SUPER CUTE content brought to you by two cutie patooties.';
	const ogImage = `${siteUrl}${logoLight}`;

	onMount(() => {
		const { data: { subscription } } = data.supabase.auth.onAuthStateChange(
			(_event: string, newSession: unknown) => {
				if (newSession !== data.session) {
					invalidate('supabase:auth');
				}
			}
		);

		return () => subscription.unsubscribe();
	});
</script>
<svelte:head>
	<title>{ogTitle}</title>
	<meta name="description" content={ogDescription} />
	<link rel="canonical" href={siteUrl} />
	<link rel="icon" href={favicon} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="ChenHub" />
	<meta property="og:title" content={ogTitle} />
	<meta property="og:description" content={ogDescription} />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:image" content={ogImage} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={ogTitle} />
	<meta name="twitter:description" content={ogDescription} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>
{@render children()}
