<script lang="ts">
	import { ACTION_LABEL, placeName, yesNo } from '#lib/admin/privacy/display.ts';
	import { kindLabel, statusLabelOf } from '#lib/admin/privacy/requests-display.ts';
	import Card from '#lib/admin/components/Card.svelte';
	import { btn, btnPrimary, fmtDate, money } from '#lib/admin/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const allowed = (on: boolean) => (on ? 'Allowed' : 'Off');
	const addr = (a: (typeof data.addresses)[number]) =>
		[
			`${a.firstName} ${a.lastName}`.trim(),
			a.company,
			a.address1,
			a.address2,
			[a.city, a.province, a.zip].filter(Boolean).join(' '),
			placeName(a.country)
		]
			.filter(Boolean)
			.join(', ');
</script>

<svelte:head><title>What we hold about {data.email}</title></svelte:head>

<div class="summary mx-auto max-w-3xl space-y-4">
	<div class="no-print flex flex-wrap items-center justify-between gap-2">
		<a class={btn} href="/admin/privacy/requests">← Back to requests</a>
		<button type="button" class={btnPrimary} onclick={() => window.print()}>Print</button>
	</div>

	<header>
		<h1 class="text-xl font-semibold text-zinc-900">What we hold about {data.email}</h1>
		<p class="text-sm text-zinc-500">
			Made {fmtDate(data.printedAt, true)} for their request: {kindLabel(data.request.kind)}. This
			page only reads; nothing is changed or deleted.
		</p>
	</header>

	<Card title="Account">
		{#if data.account}
			<dl class="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-zinc-500">Name</dt>
				<dd>{data.account.name || 'Not given'}</dd>
				<dt class="text-zinc-500">Email</dt>
				<dd>{data.account.email}</dd>
				<dt class="text-zinc-500">Phone</dt>
				<dd>{data.account.phone || 'Not given'}</dd>
				<dt class="text-zinc-500">Account opened</dt>
				<dd>{fmtDate(data.account.createdAt)}</dd>
				<dt class="text-zinc-500">Email confirmed</dt>
				<dd>{yesNo(data.account.emailVerified)}</dd>
				<dt class="text-zinc-500">Marketing emails</dt>
				<dd>{data.account.acceptsMarketing ? 'Agreed to receive them' : 'Not agreed'}</dd>
			</dl>
		{:else}
			<p class="text-sm text-zinc-500">No account with this email.</p>
		{/if}
	</Card>

	<Card title="Saved addresses">
		{#if data.addresses.length}
			<ul class="list-disc space-y-1 pl-5 text-sm">
				{#each data.addresses as a, i (i)}<li>{addr(a)}</li>{/each}
			</ul>
		{:else}<p class="text-sm text-zinc-500">No addresses.</p>{/if}
	</Card>

	<Card title="Orders">
		{#if data.orders.length}
			<ul class="divide-y divide-zinc-100 text-sm">
				{#each data.orders as o (o.number)}
					<li class="py-2">
						<p class="font-medium">
							Order #{o.number} · {fmtDate(o.createdAt)} · {money(o.total, o.currency)}
						</p>
						<ul class="text-zinc-600">
							{#each o.items as it, i (i)}
								<li>
									{it.quantity} × {it.title}{#if it.variantTitle && it.variantTitle !== 'Default'}
										({it.variantTitle}){/if}
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		{:else}<p class="text-sm text-zinc-500">No orders.</p>{/if}
	</Card>

	<Card title="Reviews">
		{#if data.reviews.length}
			<ul class="divide-y divide-zinc-100 text-sm">
				{#each data.reviews as r, i (i)}
					<li class="py-2">
						<p class="font-medium">
							{r.product ?? 'A product'} · {r.rating} out of 5 · {fmtDate(r.createdAt)}
						</p>
						<p class="text-zinc-600">
							Signed as {r.authorName}{#if r.title}: “{r.title}”{/if}
						</p>
						{#if r.body}<p class="text-zinc-600">{r.body}</p>{/if}
					</li>
				{/each}
			</ul>
		{:else}<p class="text-sm text-zinc-500">No reviews.</p>{/if}
	</Card>

	<Card title="Wishlist">
		<p class="text-sm text-zinc-500">
			Not kept by the shop. Wishlists stay in the shopper's own browser.
		</p>
	</Card>

	<Card title="Cookie choices">
		{#if data.choices.length}
			<ul class="divide-y divide-zinc-100 text-sm">
				{#each data.choices as c, i (i)}
					<li class="py-2">
						<p class="font-medium">
							{fmtDate(c.createdAt, true)} · {ACTION_LABEL[c.action] ?? 'Made a choice'}
						</p>
						<p class="text-zinc-600">
							Analytics: {allowed(c.analytics)} · Marketing: {allowed(c.marketing)} · Preferences: {allowed(
								c.preferences
							)} · From {placeName(c.country, c.regionCode)}
						</p>
					</li>
				{/each}
			</ul>
		{:else}<p class="text-sm text-zinc-500">No cookie choices linked to them.</p>{/if}
	</Card>

	<Card title="Privacy requests">
		<ul class="divide-y divide-zinc-100 text-sm">
			{#each data.requests as r, i (i)}
				<li class="py-2">
					{fmtDate(r.createdAt)} · {kindLabel(r.kind)} · {statusLabelOf(r.status)}
				</li>
			{/each}
		</ul>
	</Card>
</div>

<style>
	@media print {
		:global(body *) {
			visibility: hidden;
		}
		.summary,
		.summary :global(*) {
			visibility: visible;
		}
		.summary {
			position: absolute;
			inset: 0 auto auto 0;
			width: 100%;
			max-width: none;
		}
		.no-print {
			display: none !important;
		}
		.summary :global(section) {
			box-shadow: none;
			break-inside: avoid;
		}
	}
</style>
