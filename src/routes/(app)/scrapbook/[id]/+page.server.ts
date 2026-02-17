import { error } from '@sveltejs/kit';
import type { ScrapbookEntry, ScrapbookPolaroid } from '$lib/types/scrapbook';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { session } = await locals.safeGetSession();
	
	const { data: entry, error: fetchError } = await locals.supabase
		.from('scrapbook_entries')
		.select(`
			id,
			title,
			date,
			location,
			notes,
			tags,
			created_by,
			created_at,
			updated_at,
			polaroids:scrapbook_polaroids (
				id,
				entry_id,
				storage_path,
				caption,
				sort_order,
				created_at
			)
		`)
		.eq('id', params.id)
		.single();

	if (fetchError || !entry) {
		error(404, 'Scrapbook entry not found');
	}

	const typed = entry as ScrapbookEntry;
	const polaroids = (typed.polaroids ?? [])
		.map((polaroid) => {
			const p = polaroid as ScrapbookPolaroid;
			const { data: publicData } = locals.supabase.storage
				.from('scrapbook-polaroids')
				.getPublicUrl(p.storage_path);

			return {
				...p,
				url: publicData.publicUrl,
			};
		})
		.sort((a, b) => a.sort_order - b.sort_order);

	// Load all shared tags
	const { data: tags } = await locals.supabase
		.from('tags')
		.select('name')
		.order('name');

	return {
		entry: {
			...typed,
			polaroids,
		},
		tags: tags?.map((t) => t.name) || [],
	};
};
