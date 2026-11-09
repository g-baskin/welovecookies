<script lang="ts">
	import { enhance } from '$app/forms';
	import PrivacyHeader from '#lib/admin/privacy/PrivacyHeader.svelte';
	import { placeName } from '#lib/admin/privacy/display.ts';
	import {
		dueLabel,
		KIND_GUIDANCE,
		kindLabel,
		STATUS_LABEL
	} from '#lib/admin/privacy/requests-display.ts';
	import Badge from '#lib/admin/components/Badge.svelte';
	import Card from '#lib/admin/components/Card.svelte';
	import Empty from '#lib/admin/components/Empty.svelte';
	import Flash from '#lib/admin/components/Flash.svelte';
	import { btn, btnPrimary, fmtDate, input, label } from '#lib/admin/format.ts';
	import { PRIVACY_REQUEST_STATUSES, type PrivacyRequestKind } from '#lib/consent/types.ts';
	import type { Tone } from '#lib/admin/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const FILTERS = [
		{ key: 'open', label: 'Open' },
		{ key: 'done', label: 'Done' },
		{ key: 'all', label: 'All' }
	] as const;
	const STATUS_TONE: Record<string, Tone> = {
		new: 'attention',
		in_progress: 'info',
		done: 'success',
		declined: 'neutral'
	};
	const closed = (s: string) => s === 'done' || s === 'declined';
</script>

<svelte:head><title>Privacy requests</title></svelte:head>

<PrivacyHeader current="requests" openRequests={data.openRequests} />

<Flash form={form as { success?: string; error?: string } | null} />

<div class="mb-4 flex items-center gap-2 text-sm">
	<span class="text-zinc-500">Show</span>
	{#each FILTERS as f (f.key)}
		<a
			href="?show={f.key}"
			aria-current={data.filter === f.key ? 'page' : undefined}
			class="rounded-full px-3 py-1 font-medium {data.filter === f.key
				? 'bg-zinc-900 text-white'
				: 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50'}">{f.label}</a
		>
	{/each}
</div>

{#if data.requests.length === 0}
	<Card>
		<Empty
			title={data.filter === 'all'
				? 'No requests yet.'
				: data.filter === 'open'
					? 'Nothing waiting.'
					: 'Nothing finished yet.'}
			text={data.filter === 'all'
				? 'Shoppers can ask from the Your privacy choices page.'
				: 'No requests yet in this view. Shoppers can ask from the Your privacy choices page.'}
		/>
	</Card>
{:else}
	<div class="space-y-3">
		{#each data.requests as r (r.id)}
			{@const due = dueLabel(r.dueAt, data.now)}
			<Card>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="space-y-1">
						<p class="font-semibold text-zinc-900">{kindLabel(r.kind)}</p>
						<p class="text-sm text-zinc-700">
							{r.email}{#if r.name}<span class="text-zinc-500"> · {r.name}</span>{/if}
						</p>
						<p class="text-xs text-zinc-500">
							Received {fmtDate(r.createdAt)} · From {placeName(r.country, r.regionCode)}
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						{#if r.customerId}<Badge label="Signed in when asking" tone="success" />{/if}
						<Badge
							label={STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? 'New'}
							tone={STATUS_TONE[r.status] ?? 'neutral'}
						/>
						{#if closed(r.status)}
							<span class="text-xs text-zinc-500">Closed {fmtDate(r.closedAt)}</span>
						{:else}
							<span class="text-sm font-medium {due.overdue ? 'text-red-700' : 'text-zinc-700'}"
								>{due.text}</span
							>
						{/if}
					</div>
				</div>
				{#if r.message}
					<p class="mt-3 rounded-lg bg-zinc-50 p-3 text-sm whitespace-pre-line text-zinc-800">
						{r.message}
					</p>
				{/if}
				<p class="mt-3 text-sm text-zinc-600">
					<span class="font-medium text-zinc-800">What to do:</span>
					{KIND_GUIDANCE[r.kind as PrivacyRequestKind] ?? 'Read their message and reply by email.'}
				</p>
				<div class="mt-3 flex flex-wrap gap-2 text-sm">
					<a class={btn} href="/admin/privacy/requests/{r.id}">What we hold about them</a>
					{#if r.consentId}
						<a class={btn} href="/admin/privacy?tab=records&id={encodeURIComponent(r.consentId)}"
							>Their cookie choices</a
						>
					{/if}
					{#if r.customerId}
						<a class={btn} href="/admin/privacy/requests/{r.id}/account">Their account</a>
					{/if}
				</div>
				<form
					method="POST"
					action="?/save"
					use:enhance={() =>
						async ({ update }) =>
							update({ reset: false })}
					class="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
				>
					<input type="hidden" name="id" value={r.id} />
					<div>
						<label class={label} for="st-{r.id}">Status</label>
						<select id="st-{r.id}" name="status" class={input}>
							{#each PRIVACY_REQUEST_STATUSES as s (s)}
								<option value={s === 'in_progress' ? 'working' : s} selected={r.status === s}
									>{STATUS_LABEL[s]}</option
								>
							{/each}
						</select>
					</div>
					<div>
						<label class={label} for="note-{r.id}">Private note (only you see this)</label>
						<input
							id="note-{r.id}"
							name="note"
							class={input}
							value={r.note}
							placeholder="e.g. Asked for ID on 3 Nov"
						/>
					</div>
					<button class={btnPrimary}>Save</button>
				</form>
			</Card>
		{/each}
	</div>
{/if}
