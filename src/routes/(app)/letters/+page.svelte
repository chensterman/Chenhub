<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger,
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { Feather, Heart, Send, Sparkles, BookHeart, PenLine, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { PaginationMeta } from '$lib/utils/pagination.js';

	let { data } = $props();

	let composeOpen = $state(false);
	let newTitle = $state('');
	let newContent = $state('');
	let saving = $state(false);
	let errorMessage = $state('');

	async function createLetter() {
		if (!newTitle.trim() || !newContent.trim()) {
			errorMessage = 'Please fill in both a title and content.';
			return;
		}

		saving = true;
		errorMessage = '';

		const { error } = await data.supabase.from('letters').insert({
			title: newTitle.trim(),
			content: newContent.trim(),
			created_by: data.session?.user?.id,
		});

		if (error) {
			errorMessage = error.message;
		} else {
			newTitle = '';
			newContent = '';
			composeOpen = false;
			invalidateAll();
		}

		saving = false;
	}

	function formatDate(dateStr: string) {
		const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
		const parsedDate = dateOnlyMatch
			? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
			: new Date(dateStr);

		return parsedDate.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function getPreview(content: string, maxLength = 170) {
		if (content.length <= maxLength) return content;
		return content.slice(0, maxLength).trimEnd() + '...';
	}

	function getAuthorName(userId: string) {
		return (data as any).userNames?.[userId] ?? 'someone';
	}

	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', page.toString());
		goto(url.pathname + url.search);
	}
</script>

<div class="relative mx-auto max-w-4xl px-1 pb-4">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-700/20"></div>
		<div class="absolute top-20 -left-8 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-600/10"></div>
	</div>

	<section class="mb-8 rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
		<h1 class="font-serif text-4xl font-semibold tracking-tight">Letters</h1>
		<p class="mx-auto mt-2 max-w-xl text-sm italic text-muted-foreground">
			Leon and Kelsey's SUPER CUTE shared letters :&#41
		</p>

		<div class="mt-6 flex justify-center">
			<Dialog bind:open={composeOpen}>
				<DialogTrigger>
					{#snippet child({ props })}
						<Button {...props} class="gap-2 rounded-full px-6 py-5 text-sm shadow-md shadow-black/5">
							<PenLine class="size-4" />
							Write a letter
						</Button>
					{/snippet}
				</DialogTrigger>
				<DialogContent class="max-w-2xl rounded-2xl border-border/60 p-0 overflow-hidden" showCloseButton={false}>
					<div class="bg-gradient-to-b from-muted/40 to-background p-6">
						<DialogHeader class="text-left">
							<DialogTitle class="font-serif text-2xl">Write a new letter</DialogTitle>
							<DialogDescription>
								Say what you want to remember.
							</DialogDescription>
						</DialogHeader>

						<div class="mt-5 space-y-4 rounded-xl border border-border/60 bg-card p-4">
							<Input
								placeholder="A super cute title..."
								bind:value={newTitle}
								class="border-0 border-b rounded-none bg-transparent dark:bg-transparent shadow-none px-0 text-lg font-serif placeholder:text-muted-foreground/50 focus-visible:ring-0"
							/>
							<Textarea
								placeholder="Dear [slur],"
								bind:value={newContent}
								class="min-h-[280px] resize-none border-0 rounded-none bg-transparent dark:bg-transparent shadow-none px-0 font-serif text-[15px] leading-relaxed placeholder:text-muted-foreground/50 focus-visible:ring-0 break-words [overflow-wrap:anywhere]"
							/>
						</div>

						{#if errorMessage}
							<p class="mt-3 text-sm text-center text-destructive">{errorMessage}</p>
						{/if}

						<DialogFooter class="mt-4">
							<Button variant="outline" class="rounded-full" onclick={() => (composeOpen = false)}>Cancel</Button>
							<Button onclick={createLetter} disabled={saving} class="gap-2 rounded-full px-6">
								<Send class="size-3.5" />
								{saving ? 'Sending...' : 'Send'}
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	</section>

	{#if data.letters.length === 0}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/60 py-20 text-center shadow-sm">
			<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-300">
				<Heart class="size-7" />
			</div>
			<p class="font-serif text-lg text-muted-foreground">No letters yet</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.letters as letter}
				<button
					type="button"
					class="group w-full cursor-pointer text-left"
					onclick={() => goto(`/letters/${letter.id}`)}
				>
					<article class="relative h-full rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/75 p-6 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-orange-500/10">
						<div class="absolute right-4 top-4 text-orange-400/70 dark:text-orange-300/50">
							<BookHeart class="size-4" />
						</div>

						<div class="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
							<span class="font-medium">{getAuthorName(letter.created_by)}</span>
							<span>&middot;</span>
							<time>{formatDate(letter.created_at)}</time>
						</div>

						<h2 class="mb-2 pe-6 font-serif text-xl font-semibold tracking-tight transition-colors group-hover:text-orange-500 dark:group-hover:text-orange-300">
							{letter.title}
						</h2>

						<p class="font-serif text-sm leading-relaxed text-muted-foreground/90 break-words [overflow-wrap:anywhere]">
							{getPreview(letter.content)}
						</p>

						<Separator class="my-4" />
						<div class="flex items-center text-xs font-medium text-muted-foreground/60 transition-colors group-hover:text-orange-500/80 dark:group-hover:text-orange-300/90">
							Read more
							<span class="ml-1 transition-transform group-hover:translate-x-0.5">&rarr;</span>
						</div>
					</article>
				</button>
			{/each}
		</div>

		{#if data.pagination.totalPages > 1}
			<div class="mt-8 flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!data.pagination.hasPrevPage}
					onclick={() => goToPage(data.pagination.currentPage - 1)}
					class="gap-1"
				>
					<ChevronLeft class="size-4" />
					Previous
				</Button>

				<div class="flex items-center gap-1">
					{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as page}
						{#if page === 1 || page === data.pagination.totalPages || (page >= data.pagination.currentPage - 1 && page <= data.pagination.currentPage + 1)}
							<Button
								variant={page === data.pagination.currentPage ? 'default' : 'outline'}
								size="sm"
								onclick={() => goToPage(page)}
								class="min-w-[2.5rem]"
							>
								{page}
							</Button>
						{:else if page === data.pagination.currentPage - 2 || page === data.pagination.currentPage + 2}
							<span class="px-2 text-muted-foreground">...</span>
						{/if}
					{/each}
				</div>

				<Button
					variant="outline"
					size="sm"
					disabled={!data.pagination.hasNextPage}
					onclick={() => goToPage(data.pagination.currentPage + 1)}
					class="gap-1"
				>
					Next
					<ChevronRight class="size-4" />
				</Button>
			</div>
		{/if}
	{/if}
</div>
