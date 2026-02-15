<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import logoLight from '$lib/assets/logo-light.png';
	import logoDark from '$lib/assets/logo-dark.png';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let isSignUp = $state(false);
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let reveal = $state(false);

	const allowedEmails = ['kelseychen99@gmail.com', 'lrchen01@gmail.com'];

	onMount(() => {
		reveal = true;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		errorMessage = '';
		successMessage = '';

		if (isSignUp) {
			if (!allowedEmails.includes(email.toLowerCase().trim())) {
				errorMessage = 'Sign-ups are restricted to invited users only.';
				loading = false;
				return;
			}

			const { error } = await data.supabase.auth.signUp({
				email,
				password,
			});
			if (error) {
				errorMessage = error.message;
			} else {
				successMessage = 'Check your email for a confirmation link!';
			}
		} else {
			const { error } = await data.supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (error) {
				errorMessage = error.message;
			} else {
				window.location.href = '/';
			}
		}

		loading = false;
	}
</script>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-700/20"></div>
		<div class="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl dark:bg-amber-600/10"></div>
	</div>

	<div class="w-full max-w-sm space-y-6">
		{#if reveal}
			<div class="flex justify-center" transition:scale={{ delay: 300, duration: 500, start: 0.9 }}>
				<img src={logoLight} alt="ChenHub" class="h-36 dark:hidden" />
				<img src={logoDark} alt="ChenHub" class="h-36 hidden dark:block" />
			</div>
		{/if}

		<div class="space-y-5">
			{#if reveal}
				<div class="text-center" transition:fly={{ delay: 600, duration: 500, y: 12 }}>
					<h1 class="text-2xl font-bold tracking-tight">
						{isSignUp ? 'Create an account' : 'Welcome back'}
					</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						{isSignUp ? 'Enter your email to create an account' : 'Enter your credentials to sign in'}
					</p>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				{#if reveal}
					<div class="space-y-2" transition:fly={{ delay: 900, duration: 500, y: 12 }}>
						<label for="email" class="text-sm font-medium leading-none">Email</label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							required
						/>
					</div>
				{/if}

				{#if reveal}
					<div class="space-y-2" transition:fly={{ delay: 1200, duration: 500, y: 12 }}>
						<label for="password" class="text-sm font-medium leading-none">Password</label>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							required
						/>
					</div>
				{/if}

				{#if errorMessage}
					<p class="text-center text-sm text-destructive motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">{errorMessage}</p>
				{/if}

				{#if successMessage}
					<p class="text-center text-sm text-green-600 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">{successMessage}</p>
				{/if}

				{#if reveal}
					<div transition:fly={{ delay: 1500, duration: 500, y: 12 }}>
						<Button type="submit" class="w-full" disabled={loading}>
							{#if loading}
								Loading...
							{:else}
								{isSignUp ? 'Sign Up' : 'Sign In'}
							{/if}
						</Button>
					</div>
				{/if}
			</form>
		</div>

		{#if reveal}
			<div class="text-center text-sm" transition:fly={{ delay: 600, duration: 500, y: 12 }}>
				{#if isSignUp}
					Already have an account?
					<button
						type="button"
						class="font-medium underline underline-offset-4 hover:text-primary"
						onclick={() => { isSignUp = false; errorMessage = ''; successMessage = ''; }}
					>
						Sign in
					</button>
				{:else}
					Don't have an account?
					<button
						type="button"
						class="font-medium underline underline-offset-4 hover:text-primary"
						onclick={() => { isSignUp = true; errorMessage = ''; successMessage = ''; }}
					>
						Sign up
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
