<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ScrapbookEntry } from '$lib/types/scrapbook';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, CalendarDays, MapPin, UserRound, Tags } from '@lucide/svelte';

	let { data }: { data: { entry: ScrapbookEntry; session: any } } = $props();

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
		if (createdBy === data.session?.user?.id) {
			return data.session?.user?.email ?? 'You';
		}
		return `User ${createdBy.slice(0, 8)}`;
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
	</article>
</div>
