<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Input } from '$lib/components/ui/input';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		value?: string;
		placeholder?: string;
	}

	let { value = $bindable(''), placeholder = 'Search...' }: Props = $props();

	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		value = input.value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			applySearch(value);
		}, 300);
	}

	function clearSearch() {
		value = '';
		applySearch('');
	}

	function applySearch(q: string) {
		const url = new URL($page.url);
		if (q.trim()) {
			url.searchParams.set('q', q.trim());
		} else {
			url.searchParams.delete('q');
		}
		url.searchParams.delete('page');
		goto(url.toString(), { keepFocus: true });
	}
</script>

<div class="relative flex items-center">
	<Search class="text-muted-foreground pointer-events-none absolute left-2.5 size-4 shrink-0" />
	<Input
		type="search"
		{placeholder}
		{value}
		oninput={handleInput}
		class="pl-8 {value ? 'pr-8' : ''}"
	/>
	{#if value}
		<button
			type="button"
			onclick={clearSearch}
			class="text-muted-foreground hover:text-foreground absolute right-2.5 flex items-center"
			aria-label="Clear search"
		>
			<X class="size-4" />
		</button>
	{/if}
</div>
