<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let isSignUp = $state(false);
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	const allowedEmails = ['kelseychen99@gmail.com', 'lrchen01@gmail.com'];

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

<div class="flex min-h-screen items-center justify-center bg-background">
	<Card class="w-full max-w-sm">
		<CardHeader class="text-center">
			<CardTitle class="text-2xl font-bold tracking-tight">
				{isSignUp ? 'Create an account' : 'Welcome back'}
			</CardTitle>
			<CardDescription>
				{isSignUp ? 'Enter your email to create an account' : 'Enter your credentials to sign in'}
			</CardDescription>
		</CardHeader>

		<CardContent>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-2">
					<label for="email" class="text-sm font-medium leading-none">Email</label>
					<Input
						id="email"
						type="email"
						placeholder="you@example.com"
						bind:value={email}
						required
					/>
				</div>

				<div class="space-y-2">
					<label for="password" class="text-sm font-medium leading-none">Password</label>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						required
					/>
				</div>

				{#if errorMessage}
					<p class="text-sm text-center text-destructive">{errorMessage}</p>
				{/if}

				{#if successMessage}
					<p class="text-sm text-center text-green-600">{successMessage}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={loading}>
					{#if loading}
						Loading...
					{:else}
						{isSignUp ? 'Sign Up' : 'Sign In'}
					{/if}
				</Button>
			</form>
		</CardContent>

		<CardFooter class="justify-center">
			<div class="text-center text-sm">
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
		</CardFooter>
	</Card>
</div>
