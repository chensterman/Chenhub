import type { BucketListItem } from '$lib/types/bucket-list.js';
import { getPaginationParams, buildPaginationMeta } from '$lib/utils/pagination.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const { page, limit, offset } = getPaginationParams(url, 12);

	const urlTagParam = url.searchParams.get('tag');
	const tagFilter = urlTagParam === '__all__' ? null : urlTagParam;

	let countQuery = locals.supabase
		.from('bucket_list_items')
		.select('*', { count: 'exact', head: true });

	let dataQuery = locals.supabase
		.from('bucket_list_items')
		.select('id, title, description, tags, created_by, created_at, updated_at');

	if (tagFilter !== null) {
		countQuery = countQuery.contains('tags', [tagFilter]);
		dataQuery = dataQuery.contains('tags', [tagFilter]);
	}

	const { count, error: countError } = await countQuery;

	if (countError) {
		return {
			items: [] as BucketListItem[],
			pagination: buildPaginationMeta(0, page, limit),
			loadError: countError.message,
			activeTag: tagFilter,
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

	return {
		items: (data ?? []) as BucketListItem[],
		pagination: buildPaginationMeta(count ?? 0, page, limit),
		loadError: null,
		activeTag: tagFilter,
		userNames,
		tags: (tagsData?.map((t) => t.name) ?? []) as string[],
		session,
	};
};
