/** We Love Cookies: plain labels for privacy requests (client-safe). Never show raw kinds/statuses. */
import type { PrivacyRequestKind, PrivacyRequestStatus } from '#lib/consent/types.ts';

export const KIND_LABEL: Record<PrivacyRequestKind, string> = {
	delete: 'Delete my data',
	copy: 'Send me a copy of my data',
	correct: 'Correct my details',
	stop_selling: "Don't sell or share my information"
};

export const STATUS_LABEL: Record<PrivacyRequestStatus, string> = {
	new: 'New',
	in_progress: 'Working on it',
	done: 'Done',
	declined: 'Declined'
};

export const KIND_GUIDANCE: Record<PrivacyRequestKind, string> = {
	delete:
		"Check it's really them, then remove their account and personal details. Keep order records your tax law requires.",
	copy: "Open 'What we hold about them' and send it to them.",
	correct: 'Check what they want changed, then update their account or order details.',
	stop_selling:
		'Turn off marketing for them and stop sharing their details with ad platforms. No identity check is needed.'
};

export const kindLabel = (k: string) => KIND_LABEL[k as PrivacyRequestKind] ?? 'Other request';
export const statusLabelOf = (s: string) => STATUS_LABEL[s as PrivacyRequestStatus] ?? 'New';

const DAY = 86_400_000;
/** "Due in 12 days" / "Due today" / "Overdue by 3 days" (calendar days, UTC). */
export function dueLabel(dueAt: number, now: number): { text: string; overdue: boolean } {
	const days = Math.floor(dueAt / DAY) - Math.floor(now / DAY);
	if (days > 0) return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, overdue: false };
	if (days === 0) return { text: 'Due today', overdue: false };
	const n = -days;
	return { text: `Overdue by ${n} day${n === 1 ? '' : 's'}`, overdue: true };
}
