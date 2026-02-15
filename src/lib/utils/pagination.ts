export interface PaginationParams {
	page: number;
	limit: number;
	offset: number;
}

export interface PaginationMeta {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	limit: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

/**
 * Extract pagination parameters from URL search params
 */
export function getPaginationParams(url: URL, defaultLimit: number = 20): PaginationParams {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const limit = defaultLimit;
	const offset = (page - 1) * limit;

	return { page, limit, offset };
}

/**
 * Build pagination metadata for client-side rendering
 */
export function buildPaginationMeta(
	totalCount: number,
	currentPage: number,
	limit: number
): PaginationMeta {
	const totalPages = Math.max(1, Math.ceil(totalCount / limit));
	
	return {
		currentPage,
		totalPages,
		totalCount,
		limit,
		hasNextPage: currentPage < totalPages,
		hasPrevPage: currentPage > 1,
	};
}
