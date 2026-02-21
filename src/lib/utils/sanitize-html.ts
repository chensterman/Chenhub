/**
 * Sanitize HTML for safe use with {@html} in Svelte.
 * Only allows: <b>, <i>, <u>, <s>, <span style="color:...">.
 * Works in both browser and Node (no DOM dependency).
 */

const ALLOWED_TAGS = new Set(['b', 'i', 'u', 's', 'span', 'br', 'p']);

/** Extract only "color: value" from a style string; drops everything else. */
function sanitizeStyle(style: string): string {
	const colorMatch = /color\s*:\s*([^;]+)/i.exec(style);
	if (!colorMatch) return '';
	const value = colorMatch[1].trim();
	// Allow hex, rgb(), rgba(), hsl(), hsla(), or CSS named colors (letters/dashes)
	if (/^(#[0-9a-f]{3,8}|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|hsl\s*\([^)]+\)|hsla\s*\([^)]+\)|[a-z-]+)$/i.test(value)) {
		return `color: ${value}`;
	}
	return '';
}

/** Parse opening tag: "<span style='...'>" -> { name: 'span', style: '...' } or null. */
function parseOpeningTag(raw: string): { name: string; style?: string } | null {
	const match = /^([a-z]+)(?:\s+([^>]*))?$/i.exec(raw.trim());
	if (!match) return null;
	const name = match[1].toLowerCase();
	if (!ALLOWED_TAGS.has(name)) return null;
	if (name === 'span' && match[2]) {
		const styleMatch = /style\s*=\s*["']([^"']*)["']/i.exec(match[2]);
		const style = styleMatch ? sanitizeStyle(styleMatch[1]) : '';
		return { name, style };
	}
	// br, p, b, i, u, s: no attributes allowed
	return { name };
}

export function sanitizeLetterHtml(html: string): string {
	if (typeof html !== 'string') return '';
	let out = '';
	let i = 0;
	while (i < html.length) {
		if (html[i] === '<') {
			const end = html.indexOf('>', i);
			if (end === -1) {
				out += html[i];
				i++;
				continue;
			}
			const tagContent = html.slice(i + 1, end);
			const isClosing = tagContent.startsWith('/');
			if (isClosing) {
				const name = tagContent.slice(1).trim().toLowerCase();
				if (ALLOWED_TAGS.has(name)) {
					out += `</${name}>`;
				}
			} else {
				const parsed = parseOpeningTag(tagContent);
				if (parsed) {
					if (parsed.name === 'span' && parsed.style) {
						out += `<span style="${parsed.style}">`;
					} else if (parsed.name === 'span') {
						out += '<span>';
					} else if (parsed.name === 'br') {
						out += '<br>';
					} else {
						out += `<${parsed.name}>`;
					}
				}
			}
			i = end + 1;
		} else {
			out += html[i];
			i++;
		}
	}
	return out;
}

/** Strip all HTML tags and return plain text (e.g. for list preview). */
export function stripHtmlToText(html: string): string {
	if (typeof html !== 'string') return '';
	return html.replace(/<[^>]+>/g, '').trim();
}

/** True if content looks like HTML we should render with @html. */
export function isLetterHtml(content: string): boolean {
	return typeof content === 'string' && /<(?:\/?(?:b|i|u|s|span|br|p)(?:\s|>))/i.test(content);
}
