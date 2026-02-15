import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: letters, error } = await locals.supabase
		.from('letters')
		.select('id, title, content, created_at, updated_at, author_email')
		.order('created_at', { ascending: false });

	return { letters: letters ?? [] };
};
