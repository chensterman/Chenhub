<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, Pencil, Trash2, Save, X, Feather } from '@lucide/svelte';

	let { data } = $props();

	let editing = $state(false);
	let editTitle = $state(data.letter.title);
	let editContent = $state(data.letter.content);
	let saving = $state(false);
	let deleting = $state(false);
	let confirmDelete = $state(false);
	let errorMessage = $state('');

	const isAuthor = $derived(data.session?.user?.email === data.letter.author_email);

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

	function getAuthorName(email: string) {
		return email?.split('@')[0] ?? 'someone';
	}

	function startEditing() {
		editTitle = data.letter.title;
		editContent = data.letter.content;
		editing = true;
		errorMessage = '';
	}

	async function saveLetter() {
		if (!editTitle.trim() || !editContent.trim()) {
			errorMessage = 'Please fill in both a title and content.';
			return;
		}

		saving = true;
		errorMessage = '';

		const { error } = await data.supabase
			.from('letters')
			.update({
				title: editTitle.trim(),
				content: editContent.trim(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', data.letter.id);

		if (error) {
			errorMessage = error.message;
		} else {
			editing = false;
			invalidateAll();
		}

		saving = false;
	}

	async function deleteLetter() {
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}

		deleting = true;
		const { error } = await data.supabase
			.from('letters')
			.delete()
			.eq('id', data.letter.id);

		if (error) {
			errorMessage = error.message;
			deleting = false;
			confirmDelete = false;
		} else {
			goto('/letters');
		}
	}
</script>

<div class="relative mx-auto max-w-3xl px-1 pb-4">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-20 right-0 h-72 w-72 rounded-full bg-muted/45 blur-3xl"></div>
		<div class="absolute bottom-0 -left-12 h-64 w-64 rounded-full bg-secondary/25 blur-3xl"></div>
	</div>

	<button
		type="button"
		class="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur transition-colors hover:text-foreground cursor-pointer"
		onclick={() => goto('/letters')}
	>
		<ArrowLeft class="size-3.5" />
		All letters
	</button>

	{#if editing}
		<!-- Edit mode -->
		<div class="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-md shadow-black/5 backdrop-blur-sm">
			<div class="mb-5 flex items-center justify-between">
				<div class="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
					<Feather class="size-4 text-muted-foreground" />
					<span class="font-medium text-muted-foreground">Editing draft</span>
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
				<Input
					bind:value={editTitle}
					class="border-0 border-b rounded-none bg-transparent px-0 text-xl font-serif placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:border-foreground/20 break-words [overflow-wrap:anywhere]"
				/>
				<Textarea
					bind:value={editContent}
					class="min-h-[340px] resize-none border-0 bg-transparent px-0 font-serif text-[16px] leading-[1.9] placeholder:text-muted-foreground/50 focus-visible:ring-0 break-words [overflow-wrap:anywhere]"
				/>
			</div>

			{#if errorMessage}
				<p class="mt-3 text-sm text-center text-destructive">{errorMessage}</p>
			{/if}

			<Separator class="my-4" />

			<div class="flex justify-end gap-2">
				<Button variant="outline" class="rounded-full" onclick={() => { editing = false; errorMessage = ''; }}>Cancel</Button>
				<Button
					onclick={saveLetter}
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
				<h1 class="font-serif text-4xl font-semibold tracking-tight leading-tight sm:text-[2.65rem] break-words [overflow-wrap:anywhere]">
					{data.letter.title}
				</h1>

				<div class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
					<span class="font-medium">{getAuthorName(data.letter.author_email)}</span>
					<span>&middot;</span>
					<time>{formatDate(data.letter.created_at)}</time>
				</div>

				{#if data.letter.updated_at && data.letter.updated_at !== data.letter.created_at}
					<p class="mt-1 text-xs italic text-muted-foreground/60">
						edited {formatDate(data.letter.updated_at)}
					</p>
				{/if}
			</div>

			<div class="mx-8 sm:mx-12">
				<Separator />
			</div>

			<div class="px-8 py-8 sm:px-12">
				<div class="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-serif text-[17px] leading-[1.95] text-foreground/90">
					{data.letter.content}
				</div>
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
							onclick={deleteLetter}
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
