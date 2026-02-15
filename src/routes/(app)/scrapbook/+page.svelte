<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
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
	import { getLocalTimeZone, today, type CalendarDate, type DateRange } from '@internationalized/date';
	import { ImagePlus, Camera, MapPin, CalendarDays, Tags, CalendarRange, Trash2, UserRound } from '@lucide/svelte';

	let { data }: { data: { entries: ScrapbookEntry[]; loadError: string | null; supabase: any; session: any } } = $props();

	let composeOpen = $state(false);
	let entryDateOpen = $state(false);
	let rangeOpen = $state(false);
	let saving = $state(false);
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

	let selectedTagFilter = $state<string | null>(null);
	let selectedDateRange = $state<DateRange | undefined>();

	const quickTags = ['Date Night', 'Travel', 'Home', 'Celebration', 'Food', 'Adventure', 'Family'];

	const availableTags = $derived.by(() => {
		const tags = new Set<string>();
		for (const entry of data.entries) {
			for (const tag of entry.tags ?? []) tags.add(tag);
		}
		return Array.from(tags).sort((a, b) => a.localeCompare(b));
	});

	const dateTriggerLabel = $derived(
		newDate ? newDate.toDate(getLocalTimeZone()).toLocaleDateString() : 'Select date'
	);

	const rangeTriggerLabel = $derived.by(() => {
		if (!selectedDateRange?.start) return 'All dates';
		if (!selectedDateRange.end) return `${selectedDateRange.start.toDate(getLocalTimeZone()).toLocaleDateString()} - ...`;
		return `${selectedDateRange.start.toDate(getLocalTimeZone()).toLocaleDateString()} - ${selectedDateRange.end.toDate(getLocalTimeZone()).toLocaleDateString()}`;
	});

	const filteredEntries = $derived.by(() => {
		return data.entries.filter((entry) => {
			const matchesTag = !selectedTagFilter || entry.tags?.includes(selectedTagFilter);
			const matchesStart = !selectedDateRange?.start || entry.date >= selectedDateRange.start.toString();
			const matchesEnd = !selectedDateRange?.end || entry.date <= selectedDateRange.end.toString();
			return matchesTag && matchesStart && matchesEnd;
		});
	});

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
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

	function onFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		selectedPolaroid = input.files?.[0] ?? null;
	}

	function openFilePicker() {
		fileInputRef?.click();
	}

	function clearSelectedFile() {
		selectedPolaroid = null;
		if (fileInputRef) fileInputRef.value = '';
	}

	function getCreatorLabel(createdBy: string) {
		if (createdBy === data.session?.user?.id) {
			return data.session?.user?.email ?? 'You';
		}
		return `User ${createdBy.slice(0, 8)}`;
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
									{#each quickTags as tag}
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
										accept="image/*"
										onchange={onFileSelect}
										class="hidden"
									/>
									<div class="flex items-center gap-2">
										<Button type="button" variant="outline" class="h-9" onclick={openFilePicker}>
											Choose image
										</Button>
										{#if selectedPolaroid}
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
							<Button onclick={createEntry} disabled={saving} class="gap-2 rounded-full px-6">
								{saving ? 'Saving...' : 'Save memory'}
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	</section>

	<section class="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
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
						if (selectedDateRange?.start && selectedDateRange?.end) rangeOpen = false;
					}}
					maxValue={today(getLocalTimeZone())}
				/>
			</Popover.Content>
		</Popover.Root>

		{#if selectedDateRange?.start}
			<Button variant="ghost" size="sm" onclick={() => (selectedDateRange = undefined)}>Clear date range</Button>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			<button type="button" onclick={() => (selectedTagFilter = null)}>
				<Badge variant={!selectedTagFilter ? 'default' : 'outline'}>All tags</Badge>
			</button>
			{#each availableTags as tag}
				<button type="button" onclick={() => (selectedTagFilter = selectedTagFilter === tag ? null : tag)}>
					<Badge variant={selectedTagFilter === tag ? 'default' : 'outline'}>{tag}</Badge>
				</button>
			{/each}
		</div>
	</section>

	{#if data.loadError}
		<p class="mb-4 text-center text-sm text-destructive">{data.loadError}</p>
	{/if}

	{#if filteredEntries.length === 0}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/60 py-20 text-center shadow-sm">
			<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-300">
				<Camera class="size-7" />
			</div>
			<p class="font-serif text-lg text-muted-foreground">No memories for this filter</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each filteredEntries as entry}
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
	{/if}
</div>
