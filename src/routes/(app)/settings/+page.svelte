<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { enhance } from '$app/forms';
	import { X, Plus } from '@lucide/svelte';

	let { data, form } = $props();

	let selectedTag = $state<string | null>((data as any).defaultTagFilter ?? null);
	let newTagInput = $state<string>('');

	const allTags = $derived(data.tags.map((t: any) => t.name));

	function canDeleteTag(tag: any): boolean {
		return tag.created_by === data.currentUserId;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const form = event.target as HTMLFormElement;
			form.closest('form')?.requestSubmit();
		}
	}
</script>

<div class="flex justify-center py-8 px-4">
	<div class="w-full max-w-3xl">
		<h1 class="text-3xl font-bold mb-8">Settings</h1>

		<section class="space-y-6">
			<div>
				<h2 class="text-2xl font-semibold mb-2">Tags</h2>
				<p class="text-sm text-muted-foreground mb-6">
					Manage scrapbook tags and set your default filter. Tags are shared between all users.
				</p>
			</div>

			<!-- Default Filter Section -->
			<form method="POST" action="?/updatePreferences" use:enhance>
				<input type="hidden" name="default_tag_filter" value={selectedTag ?? ''} />

				<div class="space-y-3">
					<h3 class="text-lg font-medium">Default Filter</h3>
					<p class="text-sm text-muted-foreground">
						Choose which tag to show by default when you open the scrapbook.
					</p>
					<div class="flex flex-wrap gap-2">
						<button type="button" onclick={() => (selectedTag = null)}>
							<Badge variant={selectedTag === null ? 'default' : 'outline'}> All tags </Badge>
						</button>
						{#each allTags as tag}
							<button type="button" onclick={() => (selectedTag = tag)}>
								<Badge variant={selectedTag === tag ? 'default' : 'outline'}> {tag} </Badge>
							</button>
						{/each}
					</div>

					<div class="pt-2 flex items-center gap-3">
						<Button type="submit">Save Default Filter</Button>
						{#if form?.success}
							<p class="text-sm text-green-600">Preferences saved!</p>
						{/if}
						{#if form?.error && !form?.action}
							<p class="text-sm text-red-600">{form.error}</p>
						{/if}
					</div>
				</div>
			</form>

			<!-- Manage Tags Section -->
			<div class="space-y-3 pt-6 border-t">
				<h3 class="text-lg font-medium">Manage Tags</h3>
				<p class="text-sm text-muted-foreground">
					Add new tags or remove tags you created. Both users can see and use all tags.
				</p>
				
				<form method="POST" action="?/createTag" use:enhance>
					<div class="flex gap-2">
						<Input
							type="text"
							name="tag_name"
							placeholder="New tag name..."
							bind:value={newTagInput}
							onkeydown={handleKeydown}
							class="flex-1"
						/>
						<Button type="submit" variant="outline" size="icon">
							<Plus class="size-4" />
						</Button>
					</div>
					{#if form?.action === 'createTag' && form?.error}
						<p class="text-sm text-red-600 mt-2">{form.error}</p>
					{/if}
				</form>

				{#if data.tags.length > 0}
					<div class="space-y-2 pt-2">
						<p class="text-xs text-muted-foreground">All Tags:</p>
						<div class="flex flex-wrap gap-2">
							{#each data.tags as tag}
								<Badge variant="secondary" class="gap-1 pr-1">
									{tag.name}
									{#if canDeleteTag(tag)}
										<form method="POST" action="?/deleteTag" use:enhance class="inline">
											<input type="hidden" name="tag_id" value={tag.id} />
											<button
												type="submit"
												class="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
												title="Delete tag (you created this)"
											>
												<X class="size-3" />
											</button>
										</form>
									{/if}
								</Badge>
							{/each}
						</div>
						<p class="text-xs text-muted-foreground pt-1">
							You can only delete tags you created
						</p>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>
