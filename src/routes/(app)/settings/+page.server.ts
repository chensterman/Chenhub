import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	
	// Load user's default tag filter preference
	const { data: preferences } = await locals.supabase
		.from('user_preferences')
		.select('default_tag_filter')
		.eq('user_id', session?.user?.id)
		.single();

	// Load all shared tags
	const { data: tags } = await locals.supabase
		.from('tags')
		.select('id, name, created_by')
		.order('name');

	return {
		defaultTagFilter: preferences?.default_tag_filter || null,
		tags: tags || [],
		currentUserId: session?.user?.id
	};
};

export const actions: Actions = {
	updatePreferences: async ({ request, locals }) => {
		const { session } = await locals.safeGetSession();
		const formData = await request.formData();
		const defaultTagFilter = formData.get('default_tag_filter') as string | null;

		const { error } = await locals.supabase
			.from('user_preferences')
			.upsert({
				user_id: session?.user?.id,
				default_tag_filter: defaultTagFilter || null,
				updated_at: new Date().toISOString()
			});

		if (error) {
			return { success: false, error: error.message, action: 'updatePreferences' };
		}

		return { success: true, action: 'updatePreferences' };
	},

	createTag: async ({ request, locals }) => {
		const { session } = await locals.safeGetSession();
		const formData = await request.formData();
		const tagName = formData.get('tag_name') as string;

		if (!tagName || !tagName.trim()) {
			return { success: false, error: 'Tag name is required', action: 'createTag' };
		}

		// Check if a tag with the same name (case-insensitive) already exists
		const { data: existingTags } = await locals.supabase
			.from('tags')
			.select('name')
			.ilike('name', tagName.trim());

		if (existingTags && existingTags.length > 0) {
			return { success: false, error: 'This tag already exists (case-insensitive)', action: 'createTag' };
		}

		const { error } = await locals.supabase
			.from('tags')
			.insert({
				name: tagName.trim(),
				created_by: session?.user?.id
			});

		if (error) {
			if (error.code === '23505') { // Unique constraint violation
				return { success: false, error: 'This tag already exists', action: 'createTag' };
			}
			return { success: false, error: error.message, action: 'createTag' };
		}

		return { success: true, action: 'createTag' };
	},

	deleteTag: async ({ request, locals }) => {
		const formData = await request.formData();
		const tagId = formData.get('tag_id') as string;

		if (!tagId) {
			return { success: false, error: 'Tag ID is required', action: 'deleteTag' };
		}

		// First, get the tag name
		const { data: tag, error: fetchError } = await locals.supabase
			.from('tags')
			.select('name')
			.eq('id', tagId)
			.single();

		if (fetchError || !tag) {
			return { success: false, error: 'Tag not found', action: 'deleteTag' };
		}

		// Remove the tag from all scrapbook entries using Postgres function
		// This is much faster than looping through entries individually
		const { error: removeError } = await locals.supabase
			.rpc('remove_tag_from_entries', { tag_name_to_remove: tag.name });

		if (removeError) {
			return { success: false, error: removeError.message, action: 'deleteTag' };
		}

		// Finally, delete the tag
		const { error } = await locals.supabase
			.from('tags')
			.delete()
			.eq('id', tagId);

		if (error) {
			return { success: false, error: error.message, action: 'deleteTag' };
		}

		return { success: true, action: 'deleteTag' };
	}
};
