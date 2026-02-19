import type { ScrapbookEntry, ScrapbookPolaroid } from '$lib/types/scrapbook';
import { getPaginationParams, buildPaginationMeta } from '$lib/utils/pagination.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const { page, limit, offset } = getPaginationParams(url, 20);

	// Get user preference for default tag filter
	const { data: preferences } = await locals.supabase
		.from('user_preferences')
		.select('default_tag_filter')
		.eq('user_id', session?.user?.id)
		.single();

	// Determine the default tag filter:
	// - If no preference row exists: default to 'Highlights'
	// - If preference exists with null: means "All tags" (no filter)
	// - If preference exists with a tag: use that tag
	const defaultTagFilter = preferences !== null ? preferences.default_tag_filter : 'Highlights';

	// Get filter parameters from URL
	// If no 'tag' param in URL, use the user's default preference
	// Special value '__all__' means user explicitly clicked "All tags" to override default
	const urlTagParam = url.searchParams.get('tag');
	const tagFilter = urlTagParam === '__all__' 
		? null 
		: (urlTagParam ?? defaultTagFilter);
	
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const searchQuery = url.searchParams.get('q')?.trim() || null;

	// Build the base query
	let countQuery = locals.supabase
		.from('scrapbook_entries')
		.select('*', { count: 'exact', head: true });

	let dataQuery = locals.supabase
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
		`);

	// Apply tag filter if present and not null (null means "All tags")
	if (tagFilter !== null) {
		countQuery = countQuery.contains('tags', [tagFilter]);
		dataQuery = dataQuery.contains('tags', [tagFilter]);
	}

	// Apply free-text search filter if present
	if (searchQuery) {
		const q = `%${searchQuery}%`;
		countQuery = countQuery.or(`title.ilike.${q},notes.ilike.${q},location.ilike.${q}`);
		dataQuery = dataQuery.or(`title.ilike.${q},notes.ilike.${q},location.ilike.${q}`);
	}

	// Apply date range filters if present
	if (dateFrom) {
		countQuery = countQuery.gte('date', dateFrom);
		dataQuery = dataQuery.gte('date', dateFrom);
	}
	if (dateTo) {
		countQuery = countQuery.lte('date', dateTo);
		dataQuery = dataQuery.lte('date', dateTo);
	}

	// Get total count with filters
	const { count, error: countError } = await countQuery;

	if (countError) {
		return {
			entries: [] as ScrapbookEntry[],
			pagination: buildPaginationMeta(0, page, limit),
			loadError: countError.message,
			activeFilters: { tag: tagFilter, dateFrom, dateTo, q: searchQuery },
		};
	}

	// Get paginated entries with filters
	const { data, error } = await dataQuery
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

	// Load all shared tags
	const { data: tags } = await locals.supabase
		.from('tags')
		.select('name')
		.order('name');

	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id, email');

	const userNames: Record<string, string> = {};
	for (const p of profiles ?? []) {
		userNames[p.id] = p.email.split('@')[0];
	}

	return {
		entries,
		pagination: buildPaginationMeta(count ?? 0, page, limit),
		loadError: null,
		tags: (tags?.map((t) => t.name) || []) as string[],
		activeFilters: { 
			tag: tagFilter as string | null, 
			dateFrom: dateFrom as string | null, 
			dateTo: dateTo as string | null,
			q: searchQuery,
		},
		userNames,
	};
};
