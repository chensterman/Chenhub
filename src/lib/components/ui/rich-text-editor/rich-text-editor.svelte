<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Bold, Italic, Underline, Strikethrough, Palette } from '@lucide/svelte';

	let {
		value = $bindable(''),
		placeholder = '',
		class: className = '',
	}: {
		value?: string;
		placeholder?: string;
		class?: string;
	} = $props();

	let editorEl = $state<HTMLDivElement | null>(null);
	/** Saved selection when user mousedowns on a color control so we can apply color after focus moves. */
	let savedRange = $state<Range | null>(null);

	$effect(() => {
		const v = value ?? '';
		if (editorEl && document.activeElement !== editorEl) {
			editorEl.innerHTML = v;
		}
	});

	function syncValue() {
		if (editorEl) value = editorEl.innerHTML;
	}

	function exec(cmd: string, value?: string) {
		document.execCommand(cmd, false, value);
		editorEl?.focus();
		syncValue();
	}

	/** Call from mousedown on color controls so selection is still in the editor. */
	function saveSelectionForColor() {
		if (editorEl && document.activeElement === editorEl) {
			const sel = document.getSelection();
			if (sel && sel.rangeCount > 0) {
				savedRange = sel.getRangeAt(0).cloneRange();
			}
		}
	}

	function applyColor(hex: string) {
		const sel = document.getSelection();
		if (!sel) return;
		const range = savedRange ?? (sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
		savedRange = null;
		if (!range || !editorEl) {
			editorEl?.focus();
			return;
		}
		// Restore saved selection if we had one (focus has moved to the button)
		sel.removeAllRanges();
		sel.addRange(range);
		const contents = range.extractContents();
		const span = document.createElement('span');
		span.style.color = hex;
		span.appendChild(contents);
		range.insertNode(span);
		sel.removeAllRanges();
		range.collapse(false);
		sel.addRange(range);
		editorEl.focus();
		syncValue();
	}

	const PRESET_COLORS = [
		'#000000',
		'#dc2626',
		'#ea580c',
		'#ca8a04',
		'#16a34a',
		'#2563eb',
		'#9333ea',
		'#db2777',
	];

	function handleKeydown(e: KeyboardEvent) {
		const mod = e.metaKey || e.ctrlKey;
		if (!mod) return;
		switch (e.key.toLowerCase()) {
			case 'b':
				e.preventDefault();
				exec('bold');
				break;
			case 'i':
				e.preventDefault();
				exec('italic');
				break;
			case 'u':
				e.preventDefault();
				exec('underline');
				break;
			case 's':
				if (e.shiftKey) {
					e.preventDefault();
					exec('strikethrough');
				}
				break;
		}
	}
</script>

<div class={cn('flex flex-col rounded-md border border-input bg-transparent shadow-xs', className)}>
	<!-- Toolbar -->
	<div
		class="flex flex-wrap items-center gap-0.5 border-b border-input p-1"
		role="toolbar"
		aria-label="Text formatting"
	>
		<button
			type="button"
			class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
			title="Bold (⌘B)"
			onclick={() => exec('bold')}
		>
			<Bold class="size-4" />
		</button>
		<button
			type="button"
			class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
			title="Italic (⌘I)"
			onclick={() => exec('italic')}
		>
			<Italic class="size-4" />
		</button>
		<button
			type="button"
			class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
			title="Underline (⌘U)"
			onclick={() => exec('underline')}
		>
			<Underline class="size-4" />
		</button>
		<button
			type="button"
			class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
			title="Strikethrough (⌘⇧S)"
			onclick={() => exec('strikethrough')}
		>
			<Strikethrough class="size-4" />
		</button>
		<div class="mx-1 h-5 w-px bg-border" aria-hidden="true"></div>
		<div class="flex items-center gap-0.5" onmousedown={saveSelectionForColor}>
			{#each PRESET_COLORS as color}
				<button
					type="button"
					class="h-6 w-6 rounded border border-border shadow-sm transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
					style="background-color: {color}"
					title="Color: {color}"
					onclick={() => applyColor(color)}
				>
					<span class="sr-only">Apply color {color}</span>
				</button>
			{/each}
			<label class="flex cursor-pointer items-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
				<Palette class="size-4" />
				<input
					type="color"
					class="sr-only"
					onchange={(e) => {
						const v = (e.currentTarget as HTMLInputElement).value;
						if (v) applyColor(v);
					}}
				/>
				<span class="sr-only">Custom color</span>
			</label>
		</div>
	</div>
	<!-- Editor -->
	<div
		bind:this={editorEl}
		contenteditable="true"
		data-placeholder={placeholder}
		class="min-h-[200px] resize-none px-3 py-2 text-base outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground focus-visible:ring-0"
		oninput={syncValue}
		onpaste={syncValue}
		onkeydown={handleKeydown}
		role="textbox"
		aria-multiline="true"
	></div>
</div>

<style>
	[data-placeholder]:empty::before {
		content: attr(data-placeholder);
		color: oklch(0.554 0.046 257.417); /* muted-foreground */
	}
</style>
