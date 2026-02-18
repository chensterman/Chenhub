<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import type { BucketListItem } from '$lib/types/bucket-list.js';
	import { Badge } from '$lib/components/ui/badge';
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
	import { Separator } from '$lib/components/ui/separator';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ListChecks, Trash2, UserRound, Tags, ChevronLeft, ChevronRight, Plus, Shuffle, Star } from '@lucide/svelte';
	import type { PaginationMeta } from '$lib/utils/pagination.js';

	let { data }: {
		data: {
			items: BucketListItem[];
			pagination: PaginationMeta;
			loadError: string | null;
			activeTag: string | null;
			userNames: Record<string, string>;
			tags: string[];
			supabase: any;
			session: any;
		};
	} = $props();

	let addOpen = $state(false);
	let saving = $state(false);
	let deletingId = $state<string | null>(null);
	let confirmDeleteId = $state<string | null>(null);
	let errorMessage = $state('');

	let newTitle = $state('');
	let newDescription = $state('');
	let selectedNewTags = $state<string[]>([]);

	// Edit state
	let editOpen = $state(false);
	let editingItem = $state<BucketListItem | null>(null);
	let editTitle = $state('');
	let editDescription = $state('');
	let editTags = $state<string[]>([]);
	let editSaving = $state(false);
	let editError = $state('');

	// Lucky pick state
	let luckyOpen = $state(false);
	let luckyItem = $state<BucketListItem | null>(null);
	let luckyLoading = $state(false);
	let luckyError = $state('');

	function getCreatorLabel(createdBy: string) {
		return data.userNames?.[createdBy] ?? 'someone';
	}

	function applyTagFilter(tag: string | null) {
		const url = new URL($page.url);
		if (tag === null) {
			url.searchParams.set('tag', '__all__');
		} else {
			url.searchParams.set('tag', tag);
		}
		url.searchParams.delete('page');
		goto(url.toString(), { keepFocus: true });
	}

	function goToPage(p: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.pathname + url.search);
	}

	function toggleNewTag(tag: string) {
		selectedNewTags = selectedNewTags.includes(tag)
			? selectedNewTags.filter((t) => t !== tag)
			: [...selectedNewTags, tag];
	}

	function resetForm() {
		newTitle = '';
		newDescription = '';
		selectedNewTags = [];
		errorMessage = '';
	}

	async function addItem() {
		if (!newTitle.trim()) {
			errorMessage = 'Title is required.';
			return;
		}

		saving = true;
		errorMessage = '';

		const { error } = await data.supabase.from('bucket_list_items').insert({
			title: newTitle.trim(),
			description: newDescription.trim() || null,
			tags: selectedNewTags,
			created_by: data.session?.user?.id,
		});

		if (error) {
			errorMessage = error.message;
			saving = false;
			return;
		}

		resetForm();
		addOpen = false;
		saving = false;
		invalidateAll();
	}

	async function deleteItem(item: BucketListItem) {
		if (confirmDeleteId !== item.id) {
			confirmDeleteId = item.id;
			return;
		}

		deletingId = item.id;
		confirmDeleteId = null;

		const { error } = await data.supabase
			.from('bucket_list_items')
			.delete()
			.eq('id', item.id);

		if (error) {
			errorMessage = error.message;
		}

		deletingId = null;
		invalidateAll();
	}

	function openEdit(item: BucketListItem) {
		editingItem = item;
		editTitle = item.title;
		editDescription = item.description ?? '';
		editTags = [...item.tags];
		editError = '';
		editOpen = true;
	}

	function toggleEditTag(tag: string) {
		editTags = editTags.includes(tag)
			? editTags.filter((t) => t !== tag)
			: [...editTags, tag];
	}

	async function saveEdit() {
		if (!editTitle.trim()) {
			editError = 'Title is required.';
			return;
		}
		if (!editingItem) return;

		editSaving = true;
		editError = '';

		const { error } = await data.supabase
			.from('bucket_list_items')
			.update({
				title: editTitle.trim(),
				description: editDescription.trim() || null,
				tags: editTags,
				updated_at: new Date().toISOString(),
			})
			.eq('id', editingItem.id);

		if (error) {
			editError = error.message;
			editSaving = false;
			return;
		}

		editOpen = false;
		editingItem = null;
		editSaving = false;
		invalidateAll();
	}

	async function pickLucky() {
		luckyLoading = true;
		luckyError = '';
		luckyItem = null;

		const { count, error: countError } = await data.supabase
			.from('bucket_list_items')
			.select('*', { count: 'exact', head: true });

		if (countError || !count) {
			luckyError = count === 0 ? 'No ideas yet — add some first!' : (countError?.message ?? 'Something went wrong.');
			luckyLoading = false;
			luckyOpen = true;
			return;
		}

		const randomOffset = Math.floor(Math.random() * count);

		const { data: rows, error } = await data.supabase
			.from('bucket_list_items')
			.select('id, title, description, tags, created_by, created_at, updated_at')
			.order('created_at', { ascending: true })
			.range(randomOffset, randomOffset);

		if (error || !rows?.length) {
			luckyError = error?.message ?? 'Could not pick an item.';
			luckyLoading = false;
			luckyOpen = true;
			return;
		}

		luckyItem = rows[0] as BucketListItem;
		luckyLoading = false;
		luckyOpen = true;
	}
</script>

<div class="relative mx-auto max-w-4xl px-1 pb-4">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-muted/50 blur-3xl"></div>
		<div class="absolute top-20 -left-8 h-56 w-56 rounded-full bg-secondary/30 blur-3xl"></div>
	</div>

	<!-- Hero -->
	<section class="mb-6 rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
		<h1 class="font-serif text-4xl font-semibold tracking-tight">Bucket List</h1>
		<p class="mx-auto mt-2 max-w-xl text-sm italic text-muted-foreground">
			Leon and Kelsey's SUPER CUTE bucket list :&#41
		</p>

		<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
			<Dialog bind:open={addOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
				<DialogTrigger>
					{#snippet child({ props })}
						<Button {...props} class="gap-2 rounded-full px-6 py-5 text-sm shadow-md shadow-black/5">
							<Plus class="size-4" />
							Add idea
						</Button>
					{/snippet}
				</DialogTrigger>

				<DialogContent class="max-w-lg rounded-2xl border-border/60 p-0 overflow-hidden" showCloseButton={false}>
					<div class="bg-gradient-to-b from-muted/40 to-background p-6">
						<DialogHeader class="text-left">
							<DialogTitle class="font-serif text-2xl">New bucket list idea</DialogTitle>
							<DialogDescription>What do you want to do together?</DialogDescription>
						</DialogHeader>

						<div class="mt-5 space-y-4 rounded-xl border border-border/60 bg-card p-4">
							<div class="space-y-1.5">
								<p class="text-xs text-muted-foreground">Title (required)</p>
								<Input placeholder="e.g. Watch the Northern Lights" bind:value={newTitle} class="font-serif" />
							</div>

							<div class="space-y-1.5">
								<p class="text-xs text-muted-foreground">Description</p>
								<Textarea
									placeholder="Any notes or details..."
									bind:value={newDescription}
									class="min-h-[100px] resize-none font-serif text-[15px]"
								/>
							</div>

							<div class="space-y-2">
								<p class="text-xs text-muted-foreground">Tags</p>
								<div class="flex flex-wrap gap-2">
									{#each data.tags as tag}
										<button type="button" onclick={() => toggleNewTag(tag)}>
											<Badge variant={selectedNewTags.includes(tag) ? 'default' : 'outline'}>
												{tag}
											</Badge>
										</button>
									{/each}
								</div>
							</div>
						</div>

						{#if errorMessage}
							<p class="mt-3 text-sm text-center text-destructive">{errorMessage}</p>
						{/if}

						<DialogFooter class="mt-4">
							<Button variant="outline" class="rounded-full" onclick={() => (addOpen = false)}>Cancel</Button>
							<Button onclick={addItem} disabled={saving} class="gap-2 rounded-full px-6">
								{saving ? 'Saving...' : 'Add idea'}
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>

			<Button
				variant="outline"
				class="gap-2 rounded-full px-6 py-5 text-sm"
				onclick={pickLucky}
				disabled={luckyLoading}
			>
				<Shuffle class="size-4" />
				{luckyLoading ? 'Picking...' : "I'm feeling lucky"}
			</Button>
		</div>
	</section>

	<!-- Tag filter bar -->
	<section class="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
		<button type="button" onclick={() => applyTagFilter(null)}>
			<Badge variant={!data.activeTag ? 'default' : 'outline'}>All</Badge>
		</button>
		{#each data.tags as tag}
			<button type="button" onclick={() => applyTagFilter(data.activeTag === tag ? null : tag)}>
				<Badge variant={data.activeTag === tag ? 'default' : 'outline'}>{tag}</Badge>
			</button>
		{/each}
	</section>

	{#if data.loadError}
		<p class="mb-4 text-center text-sm text-destructive">{data.loadError}</p>
	{/if}

	{#if data.items.length === 0}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/60 py-20 text-center shadow-sm">
			<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-300">
				<ListChecks class="size-7" />
			</div>
			<p class="font-serif text-lg text-muted-foreground">
				{data.activeTag ? `No ideas tagged "${data.activeTag}"` : 'No ideas yet — add the first one!'}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.items as item}
				<div
					class="group"
					tabindex="0"
					role="button"
					onclick={() => openEdit(item)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(item); } }}
				>
					<article class="relative h-full cursor-pointer rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/75 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/10">
						{#if item.created_by === data.session?.user?.id}
							<Button
								variant="ghost"
								size="sm"
								class={`absolute right-4 top-4 z-10 h-8 rounded-full border border-border/60 bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-foreground ${confirmDeleteId === item.id ? 'px-2' : 'w-8 p-0'}`}
								disabled={deletingId === item.id}
								onpointerdown={(e) => e.stopPropagation()}
								onclick={(e) => { e.preventDefault(); e.stopPropagation(); deleteItem(item); }}
								aria-label="Delete idea"
							>
								{#if deletingId === item.id}
									<Trash2 class="size-3.5 animate-pulse" />
									<span class="sr-only">Deleting</span>
								{:else if confirmDeleteId === item.id}
									<span class="text-[11px] font-medium">Confirm delete?</span>
								{:else}
									<Trash2 class="size-3.5" />
									<span class="sr-only">Delete idea</span>
								{/if}
							</Button>
						{/if}

						<h2 class="font-serif text-xl font-semibold tracking-tight break-words [overflow-wrap:anywhere] pr-8 transition-colors group-hover:text-orange-500 dark:group-hover:text-orange-300">
							{item.title}
						</h2>

						{#if item.description}
							<p class="mt-3 font-serif text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
								{item.description}
							</p>
						{/if}

						<div class="mt-4 space-y-2 text-xs text-muted-foreground">
							<div class="flex items-center gap-1.5">
								<UserRound class="size-3.5 shrink-0" />
								Added by {getCreatorLabel(item.created_by)}
							</div>
							{#if item.tags.length > 0}
								<div class="flex items-start gap-1.5">
									<Tags class="mt-0.5 size-3.5 shrink-0" />
									<div class="flex flex-wrap gap-1">
										{#each item.tags as tag}
											<Badge variant="outline">{tag}</Badge>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<div class="mt-4 flex items-center text-xs font-medium text-muted-foreground/60 transition-colors group-hover:text-orange-500/80 dark:group-hover:text-orange-300/90">
							Edit idea
							<span class="ml-1 transition-transform group-hover:translate-x-0.5">&rarr;</span>
						</div>
					</article>
				</div>
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
					{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as p}
						{#if p === 1 || p === data.pagination.totalPages || (p >= data.pagination.currentPage - 1 && p <= data.pagination.currentPage + 1)}
							<Button
								variant={p === data.pagination.currentPage ? 'default' : 'outline'}
								size="sm"
								onclick={() => goToPage(p)}
								class="min-w-[2.5rem]"
							>
								{p}
							</Button>
						{:else if p === data.pagination.currentPage - 2 || p === data.pagination.currentPage + 2}
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

<!-- Edit dialog -->
<Dialog bind:open={editOpen} onOpenChange={(open) => { if (!open) { editingItem = null; editError = ''; } }}>
	<DialogContent class="max-w-lg rounded-2xl border-border/60 p-0 overflow-hidden" showCloseButton={false}>
		<div class="bg-gradient-to-b from-muted/40 to-background p-6">
			<DialogHeader class="text-left">
				<DialogTitle class="font-serif text-2xl">Edit idea</DialogTitle>
				<DialogDescription>Update the details for this bucket list item.</DialogDescription>
			</DialogHeader>

			<div class="mt-5 space-y-4 rounded-xl border border-border/60 bg-card p-4">
				<div class="space-y-1.5">
					<p class="text-xs text-muted-foreground">Title (required)</p>
					<Input bind:value={editTitle} class="font-serif" />
				</div>

				<div class="space-y-1.5">
					<p class="text-xs text-muted-foreground">Description</p>
					<Textarea
						bind:value={editDescription}
						class="min-h-[100px] resize-none font-serif text-[15px]"
					/>
				</div>

				<div class="space-y-2">
					<p class="text-xs text-muted-foreground">Tags</p>
					<div class="flex flex-wrap gap-2">
						{#each data.tags as tag}
							<button type="button" onclick={() => toggleEditTag(tag)}>
								<Badge variant={editTags.includes(tag) ? 'default' : 'outline'}>
									{tag}
								</Badge>
							</button>
						{/each}
					</div>
				</div>
			</div>

			{#if editError}
				<p class="mt-3 text-sm text-center text-destructive">{editError}</p>
			{/if}

			<DialogFooter class="mt-4">
				<Button variant="outline" class="rounded-full" onclick={() => (editOpen = false)}>Cancel</Button>
				<Button onclick={saveEdit} disabled={editSaving} class="gap-2 rounded-full px-6">
					{editSaving ? 'Saving...' : 'Save changes'}
				</Button>
			</DialogFooter>
		</div>
	</DialogContent>
</Dialog>

<!-- Lucky pick dialog -->
<Dialog bind:open={luckyOpen}>
	<DialogContent class="max-w-md rounded-2xl border-border/60 p-0 overflow-hidden" showCloseButton={false}>
		<div class="bg-gradient-to-b from-muted/40 to-background p-6">
			<DialogHeader class="text-left">
				<DialogTitle class="font-serif text-2xl flex items-center gap-2">
					<Star class="size-5 text-yellow-500" />
					Lucky pick!
				</DialogTitle>
				<DialogDescription>Here's what you should do next.</DialogDescription>
			</DialogHeader>

			<div class="mt-5 rounded-xl border border-border/60 bg-card p-5">
				{#if luckyLoading}
					<p class="text-sm text-muted-foreground text-center">Picking something special...</p>
				{:else if luckyError}
					<p class="text-sm text-destructive text-center">{luckyError}</p>
				{:else if luckyItem}
					<h3 class="font-serif text-xl font-semibold tracking-tight break-words [overflow-wrap:anywhere]">
						{luckyItem.title}
					</h3>
					{#if luckyItem.description}
						<p class="mt-3 font-serif text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
							{luckyItem.description}
						</p>
					{/if}
					{#if luckyItem.tags.length > 0}
						<div class="mt-4 flex flex-wrap gap-1">
							{#each luckyItem.tags as tag}
								<Badge variant="outline">{tag}</Badge>
							{/each}
						</div>
					{/if}
					<p class="mt-4 text-xs text-muted-foreground">
						Added by {getCreatorLabel(luckyItem.created_by)}
					</p>
				{/if}
			</div>

			<DialogFooter class="mt-4 flex-col gap-2 sm:flex-row">
				{#if !luckyLoading && !luckyError && luckyItem}
					<Button variant="outline" class="rounded-full gap-2" onclick={pickLucky}>
						<Shuffle class="size-3.5" />
						Pick again
					</Button>
				{/if}
				<Button class="rounded-full" onclick={() => (luckyOpen = false)}>
					{luckyError ? 'Close' : 'Got it!'}
				</Button>
			</DialogFooter>
		</div>
	</DialogContent>
</Dialog>
