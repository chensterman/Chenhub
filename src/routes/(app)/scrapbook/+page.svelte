<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import type { ScrapbookEntry } from '$lib/types/scrapbook';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import Calendar from '$lib/components/ui/calendar/calendar.svelte';
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
	import * as Popover from '$lib/components/ui/popover/index.js';
	import RangeCalendar from '$lib/components/ui/range-calendar/range-calendar.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { Textarea } from '$lib/components/ui/textarea';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import { getLocalTimeZone, today, type CalendarDate } from '@internationalized/date';
	import { ImagePlus, Camera, MapPin, CalendarDays, Tags, CalendarRange, Trash2, UserRound, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { PaginationMeta } from '$lib/utils/pagination.js';
	import { SearchBar } from '$lib/components/ui/search-bar';

	let { data }: { data: { 
		entries: ScrapbookEntry[]; 
		pagination: PaginationMeta; 
		loadError: string | null; 
		tags: string[];
		activeFilters: { tag: string | null; dateFrom: string | null; dateTo: string | null; q: string | null };
		supabase: any; 
		session: any;
	} } = $props();

	let composeOpen = $state(false);
	let entryDateOpen = $state(false);
	let rangeOpen = $state(false);
	let saving = $state(false);
	let convertingImage = $state(false);
	let deletingEntryId = $state<string | null>(null);
	let confirmDeleteEntryId = $state<string | null>(null);
	let errorMessage = $state('');

	let newTitle = $state('');
	let newDate = $state<CalendarDate | undefined>(today(getLocalTimeZone()));
	let newLocation = $state('');
	let newNotes = $state('');
	let newCaption = $state('');
	let selectedNewTags = $state<string[]>([]);
	let selectedPolaroid = $state<File | null>(null);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	const allTags = $derived(data.tags || []);

	// Get active filters from URL params (server-side filtered)
	// '__all__' is special value meaning "All tags" (user explicitly clicked it)
	const activeTagFilter = $derived.by(() => {
		const rawTag = data.activeFilters?.tag;
		return rawTag === '__all__' ? null : rawTag;
	});
	const activeDateFrom = $derived(data.activeFilters?.dateFrom || null);
	const activeDateTo = $derived(data.activeFilters?.dateTo || null);
	const activeSearch = $derived(data.activeFilters?.q || '');

	// For date range picker UI state
	let selectedDateRange = $state<RangeCalendarPrimitive.RootProps['value']>();

	const dateTriggerLabel = $derived(
		newDate ? newDate.toDate(getLocalTimeZone()).toLocaleDateString() : 'Select date'
	);

	const rangeTriggerLabel = $derived.by(() => {
		if (!activeDateFrom) return 'All dates';
		if (!activeDateTo) return `${new Date(activeDateFrom).toLocaleDateString()} - ...`;
		return `${new Date(activeDateFrom).toLocaleDateString()} - ${new Date(activeDateTo).toLocaleDateString()}`;
	});

	// Update URL to apply filters (server-side)
	function applyTagFilter(tag: string | null) {
		const url = new URL($page.url);
		if (tag === null) {
			// User explicitly clicked "All tags" - use special value to override default
			url.searchParams.set('tag', '__all__');
		} else {
			url.searchParams.set('tag', tag);
		}
		// Reset to page 1 when filtering
		url.searchParams.delete('page');
		goto(url.toString(), { keepFocus: true });
	}

	function applyDateFilter() {
		const url = new URL($page.url);
		if (selectedDateRange?.start) {
			url.searchParams.set('dateFrom', selectedDateRange.start.toString());
		} else {
			url.searchParams.delete('dateFrom');
		}
		if (selectedDateRange?.end) {
			url.searchParams.set('dateTo', selectedDateRange.end.toString());
		} else {
			url.searchParams.delete('dateTo');
		}
		// Reset to page 1 when filtering
		url.searchParams.delete('page');
		goto(url.toString(), { keepFocus: true });
	}

	function clearDateFilter() {
		selectedDateRange = undefined;
		const url = new URL($page.url);
		url.searchParams.delete('dateFrom');
		url.searchParams.delete('dateTo');
		url.searchParams.delete('page');
		goto(url.toString(), { keepFocus: true });
	}

	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', page.toString());
		goto(url.pathname + url.search);
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

	function toggleTag(tag: string) {
		selectedNewTags = selectedNewTags.includes(tag)
			? selectedNewTags.filter((t) => t !== tag)
			: [...selectedNewTags, tag];
	}

	async function onFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (!file) {
			selectedPolaroid = null;
			return;
		}

		// Check if file is HEIC/HEIF format
		const isHeic = file.type === 'image/heic' || 
		               file.type === 'image/heif' || 
		               file.name.toLowerCase().endsWith('.heic') || 
		               file.name.toLowerCase().endsWith('.heif');

		if (isHeic && browser) {
			try {
				convertingImage = true;
				errorMessage = '';

				// Dynamically import heic2any (browser only)
				const heic2any = (await import('heic2any')).default;

				// Convert HEIC to JPEG
				const convertedBlob = await heic2any({
					blob: file,
					toType: 'image/jpeg',
					quality: 0.9
				});

				// heic2any can return Blob or Blob[] depending on the image
				const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

				// Create a new File object from the converted blob
				const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
				const convertedFile = new File([blob], newFileName, {
					type: 'image/jpeg',
					lastModified: file.lastModified
				});

				selectedPolaroid = convertedFile;
			} catch (error) {
				console.error('HEIC conversion error:', error);
				errorMessage = 'Failed to convert HEIC image. Please try a different file.';
				selectedPolaroid = null;
			} finally {
				convertingImage = false;
			}
		} else {
			selectedPolaroid = file;
		}
	}

	function openFilePicker() {
		fileInputRef?.click();
	}

	function clearSelectedFile() {
		selectedPolaroid = null;
		if (fileInputRef) fileInputRef.value = '';
	}

	function getCreatorLabel(createdBy: string) {
		return (data as any).userNames?.[createdBy] ?? 'someone';
	}

	async function deleteEntry(entry: ScrapbookEntry) {
		if (confirmDeleteEntryId !== entry.id) {
			confirmDeleteEntryId = entry.id;
			return;
		}

		deletingEntryId = entry.id;
		confirmDeleteEntryId = null;
		errorMessage = '';
		const storagePaths = (entry.polaroids ?? []).map((p) => p.storage_path);

		if (storagePaths.length > 0) {
			const { error: storageError } = await data.supabase.storage
				.from('scrapbook-polaroids')
				.remove(storagePaths);

			if (storageError) {
				errorMessage = storageError.message;
				deletingEntryId = null;
				return;
			}
		}

		const { error: dbError } = await data.supabase
			.from('scrapbook_entries')
			.delete()
			.eq('id', entry.id);

		if (dbError) {
			errorMessage = dbError.message;
			deletingEntryId = null;
			return;
		}

		deletingEntryId = null;
		invalidateAll();
	}

	async function createEntry() {
		if (!newTitle.trim()) {
			errorMessage = 'Title is required.';
			return;
		}

		if (!selectedPolaroid) {
			errorMessage = 'Please upload a polaroid image.';
			return;
		}

		if (!newDate) {
			errorMessage = 'Please select a date.';
			return;
		}

		saving = true;
		errorMessage = '';

		const { data: entry, error: entryError } = await data.supabase
			.from('scrapbook_entries')
			.insert({
				title: newTitle.trim(),
				date: newDate.toString(),
				location: newLocation.trim() || null,
				notes: newNotes.trim() || null,
				tags: selectedNewTags,
				created_by: data.session?.user?.id,
			})
			.select('id')
			.single();

		if (entryError || !entry) {
			errorMessage = entryError?.message ?? 'Could not create scrapbook entry.';
			saving = false;
			return;
		}

		const safeFileName = selectedPolaroid.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
		const storagePath = `${data.session?.user?.id}/${entry.id}/${Date.now()}-${safeFileName}`;

		const { error: uploadError } = await data.supabase.storage
			.from('scrapbook-polaroids')
			.upload(storagePath, selectedPolaroid, { upsert: false });

		if (uploadError) {
			errorMessage = uploadError.message;
			saving = false;
			return;
		}

		const { error: polaroidError } = await data.supabase.from('scrapbook_polaroids').insert({
			entry_id: entry.id,
			storage_path: storagePath,
			caption: newCaption.trim() || null,
			sort_order: 0,
		});

		if (polaroidError) {
			errorMessage = polaroidError.message;
			saving = false;
			return;
		}

		newTitle = '';
		newDate = today(getLocalTimeZone());
		newLocation = '';
		newNotes = '';
		newCaption = '';
		selectedNewTags = [];
		selectedPolaroid = null;
		composeOpen = false;
		saving = false;
		invalidateAll();
	}
</script>

<div class="relative mx-auto max-w-4xl px-1 pb-4">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-muted/50 blur-3xl"></div>
		<div class="absolute top-20 -left-8 h-56 w-56 rounded-full bg-secondary/30 blur-3xl"></div>
	</div>

	<section class="mb-6 rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
		<h1 class="font-serif text-4xl font-semibold tracking-tight">Scrapbook</h1>
		<p class="mx-auto mt-2 max-w-xl text-sm italic text-muted-foreground">
			Leon and Kelsey's SUPER CUTE shared polaroid timeline :&#41
		</p>

		<div class="mt-6 flex justify-center">
			<Dialog bind:open={composeOpen}>
				<DialogTrigger>
					{#snippet child({ props })}
						<Button {...props} class="gap-2 rounded-full px-6 py-5 text-sm shadow-md shadow-black/5">
							<ImagePlus class="size-4" />
							Add memory
						</Button>
					{/snippet}
				</DialogTrigger>

				<DialogContent class="max-w-2xl rounded-2xl border-border/60 p-0 overflow-hidden" showCloseButton={false}>
					<div class="bg-gradient-to-b from-muted/40 to-background p-6">
						<DialogHeader class="text-left">
							<DialogTitle class="font-serif text-2xl">New scrapbook memory</DialogTitle>
							<DialogDescription>Upload a polaroid and add details.</DialogDescription>
						</DialogHeader>

						<div class="mt-5 space-y-4 rounded-xl border border-border/60 bg-card p-4">
							<div class="space-y-1.5">
								<p class="text-xs text-muted-foreground">Title (required)</p>
								<Input placeholder="A super cute title" bind:value={newTitle} class="font-serif" required />
							</div>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<p class="text-xs text-muted-foreground">Date</p>
									<Popover.Root bind:open={entryDateOpen}>
										<Popover.Trigger id="scrapbook-entry-date">
											{#snippet child({ props })}
												<Button {...props} variant="outline" class="w-full justify-between font-normal">
													{dateTriggerLabel}
													<ChevronDownIcon class="size-4" />
												</Button>
											{/snippet}
										</Popover.Trigger>
										<Popover.Content class="w-auto overflow-hidden p-0" align="start">
											<Calendar
												type="single"
												bind:value={newDate}
												captionLayout="dropdown"
												onValueChange={() => {
													entryDateOpen = false;
												}}
												maxValue={today(getLocalTimeZone())}
											/>
										</Popover.Content>
									</Popover.Root>
								</div>

								<div class="space-y-1.5">
									<p class="text-xs text-muted-foreground">Location</p>
									<Input placeholder="Where was this?" bind:value={newLocation} class="font-serif" />
								</div>
							</div>

							<div class="space-y-2">
								<p class="text-xs text-muted-foreground">Pick tags</p>
								<div class="flex flex-wrap gap-2">
									{#each allTags as tag}
										<button type="button" onclick={() => toggleTag(tag)}>
											<Badge variant={selectedNewTags.includes(tag) ? 'default' : 'outline'}>
												{tag}
											</Badge>
										</button>
									{/each}
								</div>
							</div>

							<Textarea
								placeholder="Notes about this memory..."
								bind:value={newNotes}
								class="min-h-[140px] resize-none font-serif text-[15px] break-words [overflow-wrap:anywhere]"
							/>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<p class="text-xs text-muted-foreground">Polaroid image (required)</p>
									<input
										bind:this={fileInputRef}
										type="file"
										accept="image/*,.heic,.heif"
										onchange={onFileSelect}
										class="hidden"
									/>
									<div class="flex items-center gap-2">
										<Button type="button" variant="outline" class="h-9" onclick={openFilePicker} disabled={convertingImage}>
											Choose image
										</Button>
										{#if convertingImage}
											<span class="text-xs text-muted-foreground">Converting image...</span>
										{:else if selectedPolaroid}
											<div class="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
												<span class="truncate">{selectedPolaroid.name}</span>
												<button
													type="button"
													class="text-muted-foreground/70 hover:text-foreground"
													onclick={clearSelectedFile}
												>
													Remove
												</button>
											</div>
										{:else}
											<span class="text-xs text-muted-foreground">No file selected</span>
										{/if}
									</div>
								</div>
								<div class="space-y-1.5">
									<p class="text-xs text-muted-foreground">Caption</p>
									<Input placeholder="A tiny caption" bind:value={newCaption} class="font-serif" />
								</div>
							</div>
						</div>

						{#if errorMessage}
							<p class="mt-3 text-sm text-center text-destructive">{errorMessage}</p>
						{/if}

						<DialogFooter class="mt-4">
							<Button variant="outline" class="rounded-full" onclick={() => (composeOpen = false)}>Cancel</Button>
							<Button onclick={createEntry} disabled={saving || convertingImage} class="gap-2 rounded-full px-6">
								{saving ? 'Saving...' : 'Save memory'}
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	</section>

	<section class="mb-8 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
		<SearchBar value={activeSearch} placeholder="Search memories..." />
		<div class="flex flex-wrap items-center gap-3">
			<Popover.Root bind:open={rangeOpen}>
				<Popover.Trigger id="scrapbook-range-date">
					{#snippet child({ props })}
						<Button {...props} variant="outline" class="justify-between font-normal">
							<CalendarRange class="size-4" />
							{rangeTriggerLabel}
							<ChevronDownIcon class="size-4" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto overflow-hidden p-0" align="start">
					<RangeCalendar
						bind:value={selectedDateRange}
						captionLayout="dropdown"
						onValueChange={() => {
							if (selectedDateRange?.start && selectedDateRange?.end) {
								rangeOpen = false;
								applyDateFilter();
							}
						}}
						maxValue={today(getLocalTimeZone())}
					/>
				</Popover.Content>
			</Popover.Root>

			{#if activeDateFrom}
				<Button variant="ghost" size="sm" onclick={clearDateFilter}>Clear date range</Button>
			{/if}

			<div class="flex flex-wrap items-center gap-2">
				<button type="button" onclick={() => applyTagFilter(null)}>
					<Badge variant={!activeTagFilter ? 'default' : 'outline'}>All tags</Badge>
				</button>
				{#each allTags as tag}
					<button type="button" onclick={() => applyTagFilter(activeTagFilter === tag ? null : tag)}>
						<Badge variant={activeTagFilter === tag ? 'default' : 'outline'}>{tag}</Badge>
					</button>
				{/each}
			</div>
		</div>
	</section>

	{#if data.loadError}
		<p class="mb-4 text-center text-sm text-destructive">{data.loadError}</p>
	{/if}

	{#if data.entries.length === 0}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/60 py-20 text-center shadow-sm">
			<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-300">
				<Camera class="size-7" />
			</div>
			<p class="font-serif text-lg text-muted-foreground">No memories for this filter</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.entries as entry}
				<div
					class="group"
					tabindex="0"
					role="button"
					onclick={() => goto(`/scrapbook/${entry.id}`)}
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							goto(`/scrapbook/${entry.id}`);
						}
					}}
				>
					<article
						class="relative h-full cursor-pointer rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/75 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/10"
					>
					{#if entry.created_by === data.session?.user?.id}
						<Button
							variant="ghost"
							size="sm"
							class={`absolute right-4 top-4 z-20 h-8 rounded-full border border-border/60 bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-foreground ${confirmDeleteEntryId === entry.id ? 'px-2' : 'w-8 p-0'}`}
							disabled={deletingEntryId === entry.id}
							onpointerdown={(event) => {
								event.stopPropagation();
							}}
							onclick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								deleteEntry(entry);
							}}
							aria-label="Delete post"
						>
							{#if deletingEntryId === entry.id}
								<Trash2 class="size-3.5 animate-pulse" />
								<span class="sr-only">Deleting post</span>
							{:else if confirmDeleteEntryId === entry.id}
								<span class="text-[11px] font-medium">Confirm delete?</span>
							{:else}
								<Trash2 class="size-3.5" />
								<span class="sr-only">Delete post</span>
							{/if}
						</Button>
					{/if}

					{#if entry.polaroids?.[0]?.url}
						<div class="relative mb-4">
							<img
								src={entry.polaroids?.[0]?.url ?? ''}
								alt={entry.polaroids?.[0]?.caption ?? entry.title ?? 'Polaroid'}
								class="aspect-[4/3] w-full rounded-2xl object-cover"
							/>
						</div>
					{:else}
						<div class="mb-4 flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
							No polaroid yet
						</div>
					{/if}

					<h2 class="font-serif text-xl font-semibold tracking-tight break-words [overflow-wrap:anywhere] transition-colors group-hover:text-orange-500 dark:group-hover:text-orange-300">
						{entry.title ?? 'Untitled memory'}
					</h2>

					<div class="mt-3 space-y-1.5 text-xs text-muted-foreground">
						<div class="flex items-center gap-1.5"><CalendarDays class="size-3.5" /> {formatDate(entry.date)}</div>
						<div class="flex items-center gap-1.5 break-words [overflow-wrap:anywhere]"><UserRound class="size-3.5" /> Created by {getCreatorLabel(entry.created_by)}</div>
						{#if entry.location}
							<div class="flex items-center gap-1.5 break-words [overflow-wrap:anywhere]"><MapPin class="size-3.5" /> {entry.location}</div>
						{/if}
						{#if entry.tags.length > 0}
							<div class="flex items-start gap-1.5">
								<Tags class="mt-0.5 size-3.5" />
								<div class="flex flex-wrap gap-1">
									{#each entry.tags as tag}
										<Badge variant="outline">{tag}</Badge>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					{#if entry.notes}
						<Separator class="my-4" />
						<p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-serif text-sm leading-relaxed text-muted-foreground/90">
							{entry.notes}
						</p>
					{/if}

						<div class="mt-4 flex items-center text-xs font-medium text-muted-foreground/60 transition-colors group-hover:text-orange-500/80 dark:group-hover:text-orange-300/90">
							Open memory
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
