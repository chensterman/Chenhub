import type { ScrapbookEntry, ScrapbookPolaroid } from '$lib/types/scrapbook';
import { getPaginationParams, buildPaginationMeta } from '$lib/utils/pagination';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { page, limit, offset } = getPaginationParams(url, 20);

	// Get total count
	const { count, error: countError } = await locals.supabase
		.from('scrapbook_entries')
		.select('*', { count: 'exact', head: true });

	if (countError) {
		return {
			entries: [] as ScrapbookEntry[],
			pagination: buildPaginationMeta(0, page, limit),
			loadError: countError.message,
		};
	}

	// Get paginated entries
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
		.order('date', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		return {
			entries: [] as ScrapbookEntry[],
			pagination: buildPaginationMeta(count ?? 0, page, limit),
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
		pagination: buildPaginationMeta(count ?? 0, page, limit),
		loadError: null,
	};
};
