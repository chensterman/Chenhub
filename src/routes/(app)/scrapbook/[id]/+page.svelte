<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import type { ScrapbookEntry } from '$lib/types/scrapbook';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import Calendar from '$lib/components/ui/calendar/calendar.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { ArrowLeft, CalendarDays, MapPin, UserRound, Tags, Pencil, Trash2, Save, X, Camera } from '@lucide/svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { getLocalTimeZone, parseDate, type CalendarDate } from '@internationalized/date';

	let { data }: { data: { entry: ScrapbookEntry; session: any; supabase: any } } = $props();

	let editing = $state(false);
	let editTitle = $state(data.entry.title ?? '');
	let editDate = $state<CalendarDate | undefined>(parseDate(data.entry.date));
	let editLocation = $state(data.entry.location ?? '');
	let editNotes = $state(data.entry.notes ?? '');
	let editTags = $state<string[]>([...data.entry.tags]);
	let editCaptions = $state<Record<string, string>>(
		Object.fromEntries((data.entry.polaroids ?? []).map((p) => [p.id, p.caption ?? '']))
	);
	let editDateOpen = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let confirmDelete = $state(false);
	let errorMessage = $state('');

	const allTags = $derived((data as any).tags || []);
	const isAuthor = $derived(data.entry.created_by === data.session?.user?.id);

	const dateTriggerLabel = $derived(
		editDate ? editDate.toDate(getLocalTimeZone()).toLocaleDateString() : 'Select date'
	);

	function formatDate(dateStr: string) {
		const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
		const parsedDate = dateOnlyMatch
			? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
			: new Date(dateStr);

		return parsedDate.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function getCreatorLabel(createdBy: string) {
		return (data as any).userNames?.[createdBy] ?? 'someone';
	}

	function startEditing() {
		editTitle = data.entry.title ?? '';
		editDate = parseDate(data.entry.date);
		editLocation = data.entry.location ?? '';
		editNotes = data.entry.notes ?? '';
		editTags = [...data.entry.tags];
		editCaptions = Object.fromEntries(
			(data.entry.polaroids ?? []).map((p) => [p.id, p.caption ?? ''])
		);
		editing = true;
		errorMessage = '';
	}

	function toggleTag(tag: string) {
		editTags = editTags.includes(tag)
			? editTags.filter((t) => t !== tag)
			: [...editTags, tag];
	}

	async function saveEntry() {
		if (!editTitle.trim()) {
			errorMessage = 'Title is required.';
			return;
		}

		if (!editDate) {
			errorMessage = 'Date is required.';
			return;
		}

		saving = true;
		errorMessage = '';

		const { error } = await data.supabase
			.from('scrapbook_entries')
			.update({
				title: editTitle.trim(),
				date: editDate.toString(),
				location: editLocation.trim() || null,
				notes: editNotes.trim() || null,
				tags: editTags,
				updated_at: new Date().toISOString(),
			})
			.eq('id', data.entry.id);

		if (error) {
			errorMessage = error.message;
			saving = false;
			return;
		}

		for (const polaroid of data.entry.polaroids ?? []) {
			const newCaption = editCaptions[polaroid.id]?.trim() || null;
			if (newCaption !== (polaroid.caption ?? null)) {
				const { error: capError } = await data.supabase
					.from('scrapbook_polaroids')
					.update({ caption: newCaption })
					.eq('id', polaroid.id);
				if (capError) {
					errorMessage = capError.message;
					saving = false;
					return;
				}
			}
		}

		editing = false;
		invalidateAll();

		saving = false;
	}

	async function deleteEntry() {
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}

		deleting = true;
		errorMessage = '';

		// Delete polaroid images from storage first
		const storagePaths = (data.entry.polaroids ?? []).map((p) => p.storage_path);
		if (storagePaths.length > 0) {
			const { error: storageError } = await data.supabase.storage
				.from('scrapbook-polaroids')
				.remove(storagePaths);

			if (storageError) {
				errorMessage = storageError.message;
				deleting = false;
				confirmDelete = false;
				return;
			}
		}

		// Delete the entry
		const { error } = await data.supabase
			.from('scrapbook_entries')
			.delete()
			.eq('id', data.entry.id);

		if (error) {
			errorMessage = error.message;
			deleting = false;
			confirmDelete = false;
		} else {
			goto('/scrapbook');
		}
	}
</script>

<div class="relative mx-auto max-w-4xl px-1 pb-4">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-20 right-0 h-72 w-72 rounded-full bg-muted/45 blur-3xl"></div>
		<div class="absolute bottom-0 -left-12 h-64 w-64 rounded-full bg-secondary/25 blur-3xl"></div>
	</div>

	<button
		type="button"
		class="mb-6 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
		onclick={() => goto('/scrapbook')}
	>
		<ArrowLeft class="size-3.5" />
		All memories
	</button>

	{#if editing}
		<!-- Edit mode -->
		<div class="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-md shadow-black/5 backdrop-blur-sm">
			<div class="mb-5 flex items-center justify-between">
				<div class="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
					<Camera class="size-4 text-muted-foreground" />
					<span class="font-medium text-muted-foreground">Editing memory</span>
				</div>
				<button
					type="button"
					class="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onclick={() => { editing = false; errorMessage = ''; }}
				>
					<X class="size-4" />
				</button>
			</div>

			<div class="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
				<div class="space-y-1.5">
					<p class="text-xs text-muted-foreground">Title (required)</p>
					<Input
						bind:value={editTitle}
						placeholder="A super cute title"
						class="font-serif"
						required
					/>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1.5">
						<p class="text-xs text-muted-foreground">Date</p>
						<Popover.Root bind:open={editDateOpen}>
							<Popover.Trigger id="edit-entry-date">
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
									bind:value={editDate}
									captionLayout="dropdown"
									onValueChange={() => {
										editDateOpen = false;
									}}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>

					<div class="space-y-1.5">
						<p class="text-xs text-muted-foreground">Location</p>
						<Input
							bind:value={editLocation}
							placeholder="Where was this?"
							class="font-serif"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs text-muted-foreground">Tags</p>
					<div class="flex flex-wrap gap-2">
						{#each allTags as tag}
							<button type="button" onclick={() => toggleTag(tag)}>
								<Badge variant={editTags.includes(tag) ? 'default' : 'outline'}>
									{tag}
								</Badge>
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-1.5">
				<p class="text-xs text-muted-foreground">Notes</p>
				<Textarea
					bind:value={editNotes}
					placeholder="Notes about this memory..."
					class="min-h-[140px] resize-none font-serif text-[15px] break-words [overflow-wrap:anywhere]"
				/>
			</div>

			{#if data.entry.polaroids && data.entry.polaroids.length > 0}
				<div class="space-y-3">
					<p class="text-xs text-muted-foreground">Photos &amp; captions</p>
					{#if data.entry.polaroids.length === 1}
					<div class="group relative overflow-hidden rounded-2xl">
						<img
							src={data.entry.polaroids[0].url ?? ''}
							alt={editCaptions[data.entry.polaroids[0].id] || 'Photo 1'}
							class="aspect-[4/3] w-full object-cover"
						/>
						<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 opacity-40 transition-all duration-200 group-hover:opacity-100">
							<div class="flex items-center gap-1.5 border-b border-white/40 pb-0.5 focus-within:border-white/80">
								<Pencil class="size-3 shrink-0 text-white/70" />
								<input
									bind:value={editCaptions[data.entry.polaroids[0].id]}
									placeholder="Add a caption..."
									class="w-full bg-transparent font-serif text-sm italic text-white placeholder-white/50 outline-none"
								/>
							</div>
						</div>
					</div>
				{:else}
					<div class="group relative overflow-hidden rounded-2xl">
						<img
							src={data.entry.polaroids[0].url ?? ''}
							alt={editCaptions[data.entry.polaroids[0].id] || 'Photo 1'}
							class="aspect-[4/3] w-full object-cover"
						/>
						<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 opacity-40 transition-all duration-200 group-hover:opacity-100">
							<div class="flex items-center gap-1.5 border-b border-white/40 pb-0.5 focus-within:border-white/80">
								<Pencil class="size-3 shrink-0 text-white/70" />
								<input
									bind:value={editCaptions[data.entry.polaroids[0].id]}
									placeholder="Add a caption..."
									class="w-full bg-transparent font-serif text-sm italic text-white placeholder-white/50 outline-none"
								/>
							</div>
						</div>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each data.entry.polaroids.slice(1) as polaroid, i}
							<div class="group relative overflow-hidden rounded-xl">
								<img
									src={polaroid.url ?? ''}
									alt={editCaptions[polaroid.id] || `Photo ${i + 2}`}
									class="aspect-[4/3] w-full object-cover"
								/>
								<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2.5 pt-6 opacity-40 transition-all duration-200 group-hover:opacity-100">
									<div class="flex items-center gap-1 border-b border-white/40 pb-0.5 focus-within:border-white/80">
										<Pencil class="size-2.5 shrink-0 text-white/70" />
										<input
											bind:value={editCaptions[polaroid.id]}
											placeholder="Add a caption..."
											class="w-full bg-transparent font-serif text-xs italic text-white placeholder-white/50 outline-none"
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
				</div>
			{/if}
			</div>

			{#if errorMessage}
				<p class="mt-3 text-sm text-center text-destructive">{errorMessage}</p>
			{/if}

			<Separator class="my-4" />

			<div class="flex justify-end gap-2">
				<Button variant="outline" class="rounded-full" onclick={() => { editing = false; errorMessage = ''; }}>Cancel</Button>
				<Button
					onclick={saveEntry}
					disabled={saving}
					class="gap-2 rounded-full px-6"
				>
					<Save class="size-3.5" />
					{saving ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</div>
	{:else}
		<!-- Read mode -->
		<article class="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card to-card/80 shadow-lg shadow-black/5">
			<div class="px-8 pt-8 pb-6 sm:px-12">
				<h1 class="font-serif text-4xl font-semibold tracking-tight leading-tight break-words [overflow-wrap:anywhere] sm:text-[2.65rem]">
					{data.entry.title ?? 'Untitled memory'}
				</h1>

				<div class="mt-4 space-y-2 text-sm text-muted-foreground">
					<div class="flex items-center gap-2"><CalendarDays class="size-3.5" /> {formatDate(data.entry.date)}</div>
					<div class="flex items-center gap-2 break-words [overflow-wrap:anywhere]"><UserRound class="size-3.5" /> Created by {getCreatorLabel(data.entry.created_by)}</div>
					{#if data.entry.location}
						<div class="flex items-center gap-2 break-words [overflow-wrap:anywhere]"><MapPin class="size-3.5" /> {data.entry.location}</div>
					{/if}
					{#if data.entry.tags.length > 0}
						<div class="flex items-start gap-2">
							<Tags class="mt-0.5 size-3.5" />
							<div class="flex flex-wrap gap-1.5">
								{#each data.entry.tags as tag}
									<Badge variant="outline">{tag}</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<div class="mx-8 sm:mx-12">
				<Separator />
			</div>

			<div class="space-y-6 px-8 py-8 sm:px-12">
				{#if data.entry.polaroids && data.entry.polaroids.length > 0}
					<img
						src={data.entry.polaroids[0].url ?? ''}
						alt={data.entry.polaroids[0].caption ?? data.entry.title ?? 'Polaroid'}
						class="aspect-[4/3] w-full rounded-2xl object-cover"
					/>
					{#if data.entry.polaroids[0].caption}
						<p class="text-sm italic text-muted-foreground">{data.entry.polaroids[0].caption}</p>
					{/if}

					{#if data.entry.polaroids.length > 1}
						<div class="grid gap-3 sm:grid-cols-2">
							{#each data.entry.polaroids.slice(1) as polaroid}
								<div class="space-y-1.5">
									<img
										src={polaroid.url ?? ''}
										alt={polaroid.caption ?? data.entry.title ?? 'Polaroid'}
										class="aspect-[4/3] w-full rounded-xl object-cover"
									/>
									{#if polaroid.caption}
										<p class="text-xs text-muted-foreground">{polaroid.caption}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}

				{#if data.entry.notes}
					<Separator />
					<p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-serif text-[17px] leading-[1.9] text-foreground/90">
						{data.entry.notes}
					</p>
				{/if}
			</div>

			{#if isAuthor}
				<div class="mx-8 mb-6 sm:mx-12">
					<Separator class="mb-4" />
					<div class="flex items-center justify-end gap-2">
						<Button
							variant="ghost"
							size="sm"
							class="gap-1.5 text-muted-foreground hover:text-foreground"
							onclick={startEditing}
						>
							<Pencil class="size-3.5" />
							Edit
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class="gap-1.5 {confirmDelete ? 'text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-foreground'}"
							onclick={deleteEntry}
							disabled={deleting}
						>
							<Trash2 class="size-3.5" />
							{#if deleting}
								Deleting...
							{:else if confirmDelete}
								Confirm delete?
							{:else}
								Delete
							{/if}
						</Button>
					</div>
				</div>
			{/if}
		</article>

		{#if errorMessage}
			<p class="mt-4 text-sm text-center text-destructive">{errorMessage}</p>
		{/if}
	{/if}
</div>
