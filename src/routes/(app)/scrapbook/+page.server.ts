import type { ScrapbookEntry, ScrapbookPolaroid } from '$lib/types/scrapbook';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error } = await locals.supabase
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
		.order('date', { ascending: false });

	if (error) {
		return {
			entries: [] as ScrapbookEntry[],
			loadError: error.message,
		};
	}

	const entries = ((data ?? []) as ScrapbookEntry[]).map((entry) => ({
		...entry,
		polaroids: (entry.polaroids ?? []).map((polaroid) => {
			const typed = polaroid as ScrapbookPolaroid;
			const { data: publicData } = locals.supabase.storage
				.from('scrapbook-polaroids')
				.getPublicUrl(typed.storage_path);

			return {
				...typed,
				url: publicData.publicUrl,
			};
		}),
	}));

	return {
		entries,
		loadError: null,
	};
};
