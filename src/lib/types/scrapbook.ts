export interface ScrapbookEntry {
	id: string;
	title: string | null;
	date: string;
	location: string | null;
	notes: string | null;
	tags: string[];
	source: 'polaroid' | 'note' | 'both' | null;
	created_by: string;
	created_at: string;
	updated_at: string;
	polaroids?: ScrapbookPolaroid[];
}

export interface ScrapbookPolaroid {
	id: string;
	entry_id: string;
	storage_path: string;
	caption: string | null;
	sort_order: number;
	created_at: string;
	url?: string;
}

export type SortOrder = 'newest' | 'oldest';

export type EntryFilter = {
	tags?: string[];
	location?: string;
	dateFrom?: string;
	dateTo?: string;
	source?: 'polaroid' | 'note' | 'both' | null;
};
