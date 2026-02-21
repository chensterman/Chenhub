import type { ScrapbookEntry, ScrapbookPolaroid } from '$lib/types/scrapbook';
import { getPaginationParams, buildPaginationMeta } from '$lib/utils/pagination.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const { page, limit, offset } = getPaginationParams(url, 20);

	// Bucket list item filter — mutually exclusive with tag filter
	const bucketListItemId = url.searchParams.get('bucket_list_item');

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
	// Tag filter is ignored when filtering by bucket list item
	const urlTagParam = url.searchParams.get('tag');
	const tagFilter = bucketListItemId
		? null
		: urlTagParam === '__all__'
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

	// When filtering by bucket list item, restrict to linked entries via the join table
	if (bucketListItemId) {
		const { data: memoryLinks } = await locals.supabase
			.from('bucket_list_memories')
			.select('scrapbook_entry_id')
			.eq('bucket_list_item_id', bucketListItemId);

		const linkedIds = (memoryLinks ?? []).map((r: { scrapbook_entry_id: string }) => r.scrapbook_entry_id);

		if (linkedIds.length === 0) {
			// No linked entries — return empty result immediately
			const [{ data: tags }, { data: profiles }, { data: bucketItem }] = await Promise.all([
				locals.supabase.from('tags').select('name').order('name'),
				locals.supabase.from('profiles').select('id, email'),
				locals.supabase.from('bucket_list_items').select('title').eq('id', bucketListItemId).single(),
			]);

			const userNames: Record<string, string> = {};
			for (const p of profiles ?? []) {
				userNames[p.id] = p.email.split('@')[0];
			}

			return {
				entries: [] as ScrapbookEntry[],
				pagination: buildPaginationMeta(0, page, limit),
				loadError: null,
				tags: (tags?.map((t: { name: string }) => t.name) || []) as string[],
				activeFilters: { tag: null, dateFrom, dateTo, q: searchQuery },
				bucketListItem: bucketItem ? { id: bucketListItemId, title: bucketItem.title as string } : null,
				userNames,
			};
		}

		countQuery = countQuery.in('id', linkedIds);
		dataQuery = dataQuery.in('id', linkedIds);
	} else if (tagFilter !== null) {
		// Apply tag filter if present and not null (null means "All tags")
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
			bucketListItem: null,
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
			bucketListItem: null,
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

	// Load all shared tags and profiles
	const [{ data: tags }, { data: profiles }] = await Promise.all([
		locals.supabase.from('tags').select('name').order('name'),
		locals.supabase.from('profiles').select('id, email'),
	]);

	// Optionally fetch the bucket list item title for the banner
	let bucketItem: { title: string } | null = null;
	if (bucketListItemId) {
		const { data } = await locals.supabase
			.from('bucket_list_items')
			.select('title')
			.eq('id', bucketListItemId)
			.single();
		bucketItem = data;
	}

	const userNames: Record<string, string> = {};
	for (const p of profiles ?? []) {
		userNames[p.id] = p.email.split('@')[0];
	}

	return {
		entries,
		pagination: buildPaginationMeta(count ?? 0, page, limit),
		loadError: null,
		tags: (tags?.map((t: { name: string }) => t.name) || []) as string[],
		activeFilters: { 
			tag: tagFilter as string | null, 
			dateFrom: dateFrom as string | null, 
			dateTo: dateTo as string | null,
			q: searchQuery,
		},
		bucketListItem: bucketListItemId && bucketItem
			? { id: bucketListItemId, title: bucketItem.title as string }
			: null,
		userNames,
	};
};
