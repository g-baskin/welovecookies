<script lang="ts">
	import { consentManager } from '#lib/storefront/consent-manager.svelte.ts';
	import type { OptionalCategory } from '#lib/consent/types.ts';
	import { enhance } from '$app/forms';
	import { KIND_LABEL } from '#lib/admin/privacy/requests-display.ts';
	import type { PrivacyRequestKind } from '#lib/consent/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const KIND_HINT: Record<PrivacyRequestKind, string> = {
		delete: 'We remove your account and personal details. We keep order records the law requires.',
		copy: 'We email you what we hold about you.',
		correct: 'Tell us what is wrong in the message box.',
		stop_selling: 'We stop sharing your details with ad platforms and other partners.'
	};
	const kinds = $derived<PrivacyRequestKind[]>(
		data.doNotSell
			? ['stop_selling', 'delete', 'copy', 'correct']
			: ['delete', 'copy', 'correct', 'stop_selling']
	);
	const values = $derived(
		(form && 'values' in form ? form.values : null) as Record<string, string> | null
	);
	const sent = $derived(form && 'requestSent' in form ? form.requestSent : null);
	const requestError = $derived(form && 'requestError' in form ? form.requestError : null);
	let sending = $state(false);
	const btn = 'rounded-button px-4 py-2.5 font-medium min-h-11';
	const CATEGORY = {
		necessary: {
			title: 'Necessary',
			text: 'Keeps your bag, sign-in, checkout and security working. Always on.'
		},
		preferences: { title: 'Preferences', text: 'Remembers choices like language or region.' },
		analytics: {
			title: 'Analytics',
			text: 'Shows us which pages and products people use, so we can improve the shop.'
		},
		marketing: {
			title: 'Marketing',
			text: 'Remembers which ad brought you here and tells that ad platform (Meta, TikTok, Google or Microsoft) if you buy.'
		}
	} as const;
	const optional: OptionalCategory[] = ['analytics', 'marketing', 'preferences'];
	const shown = $derived(
		optional
			.filter((k) => k !== 'preferences' || data.preferencesCategory)
			.map((k) => ({ key: k, ...CATEGORY[k], on: data.grants[k] }))
	);
	const groups = $derived(
		(['necessary', 'preferences', 'analytics', 'marketing'] as const)
			.map((c) => ({ c, rows: data.cookies.filter((r) => r.category === c) }))
			.filter((g) => g.rows.length && (g.c !== 'preferences' || data.preferencesCategory))
	);
	const when = $derived(
		data.chosenAt
			? new Date(data.chosenAt).toLocaleDateString(undefined, { dateStyle: 'long' })
			: null
	);
	let copied = $state(false);
	async function copyId() {
		if (!data.consentId) return;
		await navigator.clipboard?.writeText(data.consentId);
		copied = true;
	}
</script>

<svelte:head
	><title>Your privacy choices</title><meta name="robots" content="noindex" /></svelte:head
>

<div class="mx-auto max-w-2xl space-y-6 px-4 py-10 font-body text-fg">
	<header class="space-y-2">
		<h1 class="font-heading text-2xl font-semibold">Your privacy choices</h1>
		<p class="text-muted-fg">
			You decide what this shop may remember about your visit. The shop works the same whatever you
			choose, and you can change your mind at any time.
		</p>
	</header>

	{#if data.gpc}
		<p class="rounded-theme border border-border bg-muted p-4" role="status">
			<strong>Opt-out preference signal honored.</strong> Your browser sends Global Privacy Control, so
			we do not use marketing cookies or share your purchases with ad platforms.
		</p>
	{/if}

	<section aria-labelledby="now" class="space-y-3">
		<h2 id="now" class="text-lg font-semibold">What is allowed right now</h2>
		<ul class="divide-y divide-border rounded-theme border border-border">
			<li class="flex items-start justify-between gap-4 p-4">
				<div>
					<p class="font-medium">{CATEGORY.necessary.title}</p>
					<p class="text-sm text-muted-fg">{CATEGORY.necessary.text}</p>
				</div>
				<span class="shrink-0 text-sm font-medium">Always on</span>
			</li>
			{#each shown as s (s.key)}
				<li class="flex items-start justify-between gap-4 p-4">
					<div>
						<p class="font-medium">{s.title}</p>
						<p class="text-sm text-muted-fg">{s.text}</p>
					</div>
					<span class="shrink-0 text-sm font-medium {s.on ? '' : 'text-muted-fg'}"
						>{s.on ? 'Allowed' : 'Off'}</span
					>
				</li>
			{/each}
		</ul>
		{#if !data.chosen && data.optIn}
			<p class="text-sm text-muted-fg">
				You have not chosen yet, so analytics and marketing are not allowed. Only necessary cookies
				are on.
			</p>
		{/if}
	</section>

	<div class="flex flex-wrap gap-2">
		{#if consentManager.current}
			<button
				type="button"
				class="{btn} bg-primary text-primary-fg"
				onclick={() => consentManager.current?.openPreferences()}>Change cookie settings</button
			>
		{/if}
		<form method="POST" action="/api/consent">
			<input type="hidden" name="choice" value={data.optIn ? 'accept' : 'optin'} />
			<input type="hidden" name="landing" value="/privacy-choices" />
			<button class="{btn} border border-border">Allow all</button>
		</form>
		<form method="POST" action="/api/consent">
			<input type="hidden" name="choice" value={data.optIn ? 'decline' : 'optout'} />
			<input type="hidden" name="landing" value="/privacy-choices" />
			<button class="{btn} border border-border"
				>{data.doNotSell
					? 'Do not sell or share my personal information'
					: data.optIn
						? 'Reject all'
						: 'Turn off marketing'}</button
			>
		</form>
	</div>

	{#if data.consentId}
		<section aria-labelledby="proof" class="space-y-2 rounded-theme bg-muted p-4 text-sm">
			<h2 id="proof" class="font-semibold">Your reference</h2>
			<p>
				We keep a record of each choice (what you chose, when, and which version of our banner you
				saw) so we can prove we respected it. Quote this reference if you contact us about it.
			</p>
			<p class="flex flex-wrap items-center gap-2">
				<code class="rounded bg-bg px-2 py-1 font-mono">{data.consentId}</code>
				<button type="button" class="underline" onclick={copyId}
					>{copied ? 'Copied' : 'Copy'}</button
				>
				{#if when}<span class="text-muted-fg">Last changed {when}</span>{/if}
			</p>
		</section>
	{/if}

	<section aria-labelledby="list" class="space-y-4">
		<h2 id="list" class="text-lg font-semibold">Cookies we use</h2>
		{#each groups as g (g.c)}
			<div class="space-y-2">
				<h3 class="font-medium">{CATEGORY[g.c].title}</h3>
				<div class="overflow-x-auto rounded-theme border border-border">
					<table class="w-full text-left text-sm">
						<thead class="bg-muted text-muted-fg">
							<tr>
								<th scope="col" class="p-2 font-medium">Name</th>
								<th scope="col" class="p-2 font-medium">Provider</th>
								<th scope="col" class="p-2 font-medium">Purpose</th>
								<th scope="col" class="p-2 font-medium">Kept for</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							{#each g.rows as r (r.name)}
								<tr>
									<td class="p-2">
										{#if r.label}
											<span class="block">{r.label}</span>
											<span class="block font-mono text-xs text-muted-fg">{r.name}</span>
										{:else}
											<span class="font-mono text-xs">{r.name}</span>
										{/if}
									</td>
									<td class="p-2">{r.provider}</td>
									<td class="p-2">{r.purpose}</td>
									<td class="p-2 whitespace-nowrap">{r.duration}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/each}
	</section>

	<section
		aria-labelledby="ask"
		id="ask"
		class="space-y-4 rounded-theme border border-border p-4 sm:p-6"
	>
		<div class="space-y-1">
			<h2 id="ask" class="font-heading text-lg font-semibold">Ask about your data</h2>
			<p class="text-sm text-muted-fg">
				You can ask us to delete, send or correct what we hold about you, or to stop selling or
				sharing it. We'll reply by email within {data.replyDays} days.
			</p>
		</div>
		{#if sent}
			<p class="rounded-theme bg-muted p-4" role="status">
				<strong>We got your request.</strong> We'll reply by email to {sent.email} within {sent.days}
				days.
			</p>
		{:else}
			<form
				method="POST"
				action="?/request"
				class="space-y-4"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						await update({ reset: false });
						sending = false;
					};
				}}
			>
				{#if requestError}
					<p class="rounded-theme border border-sale p-3 text-sm text-sale" role="alert">
						{requestError}
					</p>
				{/if}
				<fieldset class="space-y-2">
					<legend class="mb-1 font-medium">What would you like us to do?</legend>
					{#each kinds as k, i (k)}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-theme border border-border p-3 has-[:checked]:bg-muted"
						>
							<input
								type="radio"
								name="kind"
								value={k}
								class="mt-1 size-4 accent-current"
								checked={values ? values.kind === k : i === 0}
							/>
							<span>
								<span class="block font-medium">{KIND_LABEL[k]}</span>
								<span class="block text-sm text-muted-fg">{KIND_HINT[k]}</span>
							</span>
						</label>
					{/each}
				</fieldset>
				<div class="space-y-1">
					<label for="pr-email" class="block font-medium">Email</label>
					<input
						id="pr-email"
						name="email"
						type="email"
						required
						autocomplete="email"
						readonly={!!data.signedInEmail}
						value={data.signedInEmail ?? values?.email ?? ''}
						class="min-h-11 w-full rounded-button border border-border bg-bg px-3 py-2 text-fg"
					/>
					<p class="text-sm text-muted-fg">
						{data.signedInEmail
							? "You're signed in, so we'll use your account email. This helps us confirm it's you."
							: "We'll reply here. We may ask you to confirm it's you first."}
					</p>
				</div>
				<div class="space-y-1">
					<label for="pr-name" class="block font-medium"
						>Name <span class="font-normal text-muted-fg">(optional)</span></label
					>
					<input
						id="pr-name"
						name="name"
						autocomplete="name"
						maxlength="120"
						value={values?.name ?? ''}
						class="min-h-11 w-full rounded-button border border-border bg-bg px-3 py-2 text-fg"
					/>
				</div>
				<div class="space-y-1">
					<label for="pr-message" class="block font-medium"
						>Anything we should know? <span class="font-normal text-muted-fg">(optional)</span
						></label
					>
					<textarea
						id="pr-message"
						name="message"
						rows="3"
						maxlength="1000"
						class="w-full rounded-theme border border-border bg-bg px-3 py-2 text-fg"
						>{values?.message ?? ''}</textarea
					>
				</div>
				<div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
					<label>Leave this empty <input name="website" tabindex="-1" autocomplete="off" /></label>
				</div>
				<button class="{btn} bg-primary text-primary-fg" disabled={sending}
					>{sending ? 'Sending…' : 'Send request'}</button
				>
			</form>
		{/if}
	</section>

	<p class="text-sm text-muted-fg">
		Your choice is saved in this browser. We honor Global Privacy Control. Read more in our privacy
		policy.
	</p>
</div>
