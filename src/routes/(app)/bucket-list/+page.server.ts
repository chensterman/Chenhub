import type { BucketListItem } from '$lib/types/bucket-list.js';
import { getPaginationParams, buildPaginationMeta } from '$lib/utils/pagination.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const { page, limit, offset } = getPaginationParams(url, 12);

	const urlTagParam = url.searchParams.get('tag');
	const tagFilter = urlTagParam === '__all__' ? null : urlTagParam;
	const searchQuery = url.searchParams.get('q')?.trim() || null;
	const showCompleted = url.searchParams.get('showCompleted') === 'true';

	let countQuery = locals.supabase
		.from('bucket_list_items')
		.select('*', { count: 'exact', head: true });

	let dataQuery = locals.supabase
		.from('bucket_list_items')
		.select(`
			id,
			title,
			description,
			tags,
			created_by,
			created_at,
			updated_at,
			completed_at,
			memory_count:bucket_list_memories(count)
		`);

	// By default only show incomplete items
	if (!showCompleted) {
		countQuery = countQuery.is('completed_at', null);
		dataQuery = dataQuery.is('completed_at', null);
	}

	if (tagFilter !== null) {
		countQuery = countQuery.contains('tags', [tagFilter]);
		dataQuery = dataQuery.contains('tags', [tagFilter]);
	}

	if (searchQuery) {
		const q = `%${searchQuery}%`;
		countQuery = countQuery.or(`title.ilike.${q},description.ilike.${q}`);
		dataQuery = dataQuery.or(`title.ilike.${q},description.ilike.${q}`);
	}

	const { count, error: countError } = await countQuery;

	if (countError) {
		return {
			items: [] as BucketListItem[],
			pagination: buildPaginationMeta(0, page, limit),
			loadError: countError.message,
			activeTag: tagFilter,
			activeSearch: searchQuery,
			showCompleted,
			userNames: {} as Record<string, string>,
			tags: [] as string[],
		};
	}

	const { data, error } = await dataQuery
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		return {
			items: [] as BucketListItem[],
			pagination: buildPaginationMeta(count ?? 0, page, limit),
			loadError: error.message,
			activeTag: tagFilter,
			activeSearch: searchQuery,
			showCompleted,
			userNames: {} as Record<string, string>,
			tags: [] as string[],
		};
	}

	const [{ data: profiles }, { data: tagsData }] = await Promise.all([
		locals.supabase.from('profiles').select('id, email'),
		locals.supabase.from('tags').select('name').order('name'),
	]);

	const userNames: Record<string, string> = {};
	for (const p of profiles ?? []) {
		userNames[p.id] = p.email.split('@')[0];
	}

	// Flatten the memory_count aggregate from Supabase's nested count format
	const items = ((data ?? []) as any[]).map((item) => ({
		...item,
		memory_count: item.memory_count?.[0]?.count ?? 0,
	})) as BucketListItem[];

	return {
		items,
		pagination: buildPaginationMeta(count ?? 0, page, limit),
		loadError: null,
		activeTag: tagFilter,
		activeSearch: searchQuery,
		showCompleted,
		userNames,
		tags: (tagsData?.map((t) => t.name) ?? []) as string[],
		session,
	};
};
