<script lang="ts">
	import { enhance } from '$app/forms';
	import Card from '#lib/admin/components/Card.svelte';
	import Empty from '#lib/admin/components/Empty.svelte';
	import Flash from '#lib/admin/components/Flash.svelte';
	import PrivacyHeader from '#lib/admin/privacy/PrivacyHeader.svelte';
	import { btn, btnDanger, btnPrimary, fmtDate, input, label } from '#lib/admin/format.ts';
	import {
		ACTION_LABEL,
		browserName,
		countryName,
		placeName,
		BANNER_LANGUAGES,
		EDITABLE_TEXTS,
		MODE_LABEL,
		PRIVACY_PERIODS,
		pct,
		type Tally
	} from '#lib/admin/privacy/display.ts';
	import { CONSENT_CATEGORIES } from '#lib/consent/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const CATEGORY_LABEL: Record<string, string> = {
		necessary: 'Needed for the store',
		preferences: 'Preferences',
		analytics: 'Statistics',
		marketing: 'Marketing'
	};
	const DEVICE_LABEL: Record<string, string> = {
		phone: 'Phone',
		tablet: 'Tablet',
		desktop: 'Computer'
	};
	const POSITION_LABEL: Record<string, string> = {
		auto: 'Automatic (recommended)',
		'bottom-left': 'Bottom left',
		'bottom-right': 'Bottom right',
		'bottom-center': 'Bottom center'
	};

	const s = $derived(data.settings);
	const langTexts = $derived((s.texts[data.lang] ?? {}) as Partial<Record<string, string>>);
	const langName = $derived(BANNER_LANGUAGES.find((l) => l.code === data.lang)?.name ?? 'English');
	let storeTheme = $state(true);
	$effect.pre(() => {
		storeTheme = Object.keys(data.settings.theme).length === 0;
	});
	const answered = (t: Tally) => t.acceptAll + t.rejectAll + t.custom;
	const today = new Date().toISOString().slice(0, 10);
	const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
</script>

<PrivacyHeader current={data.tab} openRequests={data.openRequests} />

<Flash {form} />

{#if data.tab === 'overview' && data.overview}
	{@const o = data.overview}
	{#if data.websites.length}
		<form method="GET" class="mb-3 flex items-center gap-2 text-sm">
			<input type="hidden" name="tab" value="overview" />
			<input type="hidden" name="days" value={data.days} />
			<label for="site-pick" class="text-zinc-600">Showing</label>
			<select
				id="site-pick"
				name="site"
				class="rounded-lg border border-zinc-300 bg-white px-2 py-1.5"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				<option value="" selected={data.site === ''}>This store</option>
				{#each data.websites as w (w.key)}
					<option value={w.key} selected={data.site === w.key}>{w.name}</option>
				{/each}
			</select>
			<noscript><button class={btn}>Show</button></noscript>
		</form>
	{/if}
	<div class="mb-4 flex gap-2 text-sm">
		{#each PRIVACY_PERIODS as d (d)}
			<a
				href="?tab=overview&days={d}{data.site ? `&site=${data.site}` : ''}"
				class="rounded-lg px-3 py-1.5 {data.days === d
					? 'bg-zinc-900 text-white'
					: 'bg-white text-zinc-700 ring-1 ring-zinc-200'}">Last {d} days</a
			>
		{/each}
	</div>
	{#if o.total.seen === 0 && o.total.answered === 0}
		<Card>
			<Empty
				title="No visitors have seen the banner yet"
				text="Numbers show up here once shoppers visit your store. Want to see it yourself? Open the Banner tab and use “Preview on my store”."
			>
				<a class={btn} href="?tab=banner">Go to Banner</a>
			</Empty>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card title="Banner views">
				<p class="text-2xl font-semibold">{o.total.seen}</p>
				<p class="text-xs text-zinc-500">Times the banner was shown.</p>
			</Card>
			<Card title="Answered">
				<p class="text-2xl font-semibold">{pct(o.total.answered, o.total.seen)}</p>
				<p class="text-xs text-zinc-500">
					{o.total.answered} visitors made a choice or pressed OK.
				</p>
			</Card>
			<Card title="Accept all / Reject all / Chose some">
				<p class="text-lg font-semibold">
					{pct(o.total.acceptAll, answered(o.total))} / {pct(o.total.rejectAll, answered(o.total))}
					/ {pct(o.total.custom, answered(o.total))}
				</p>
				<p class="text-xs text-zinc-500">Share of the choices made on the full banner.</p>
			</Card>
			<Card title="Said yes to statistics or marketing">
				<p class="text-2xl font-semibold">{pct(o.optIn.allowed, o.optIn.of)}</p>
				<p class="text-xs text-zinc-500">Of {o.optIn.of} banner choices.</p>
			</Card>
		</div>

		<div class="mt-4 grid gap-4 lg:grid-cols-3">
			<Card title="By region rules">
				<ul class="space-y-3 text-sm">
					{#each o.byRegion as r (r.key)}
						<li>
							<div class="flex justify-between font-medium">
								<span>{r.label}</span><span
									>{r.tally.seen} views · {pct(r.tally.answered, r.tally.seen)} answered</span
								>
							</div>
							<p class="text-xs text-zinc-500">{r.hint}</p>
						</li>
					{/each}
				</ul>
			</Card>
			<Card title="By device">
				<ul class="space-y-2 text-sm">
					{#each o.byDevice as d (d.key)}
						<li class="flex justify-between">
							<span>{DEVICE_LABEL[d.key]}</span><span
								>{d.tally.seen} views · {pct(d.tally.answered, d.tally.seen)} answered</span
							>
						</li>
					{/each}
				</ul>
			</Card>
			<Card title="Top countries">
				<ul class="space-y-2 text-sm">
					{#each o.topCountries as c (c.country)}
						<li class="flex justify-between">
							<span>{countryName(c.country)}</span><span
								>{c.tally.seen} views · {c.tally.answered} answered</span
							>
						</li>
					{/each}
				</ul>
			</Card>
		</div>
		<p class="mt-3 text-xs text-zinc-500">
			Counts never include bots, link previews or you while signed in to the admin. No visitor is
			identified in these numbers.
		</p>
	{/if}
{:else if data.tab === 'banner'}
	<div class="grid gap-4 lg:grid-cols-3">
		<div class="space-y-4 lg:col-span-2">
			<form method="POST" action="?/banner" use:enhance class="space-y-4">
				<input type="hidden" name="lang" value={data.lang} />
				<Card title="Banner">
					<div class="space-y-3 text-sm">
						<label class="flex items-center gap-2"
							><input type="checkbox" name="enabled" checked={s.enabled} /> Show the cookie banner on
							my store</label
						>
						<div>
							<label class={label} for="position">Where it sits on computers and tablets</label>
							<select id="position" name="position" class={input}>
								{#each Object.entries(POSITION_LABEL) as [v, l] (v)}
									<option value={v} selected={s.position === v}>{l}</option>
								{/each}
							</select>
							<p class="mt-1 text-xs text-zinc-500">
								On phones it always slides up from the bottom.
							</p>
						</div>
						<label class="flex items-center gap-2"
							><input type="checkbox" name="floatingButton" checked={s.floatingButton} /> Small cookie
							button so visitors can change their mind later (it fades away 5 seconds after their choice,
							or as soon as they scroll or search)</label
						>
						<div>
							<label class="flex items-center gap-2"
								><input type="checkbox" name="showLogo" checked={s.showLogo} /> Show my store logo on
								the banner</label
							>
							{#if !data.hasLogo}
								<p class="mt-1 text-xs text-zinc-500">
									Your store has no logo yet. Add one in <a
										class="underline"
										href="/admin/settings/store">Settings → Store</a
									>; until then the banner shows a small cookie picture.
								</p>
							{/if}
						</div>
						<label class="flex items-center gap-2"
							><input type="checkbox" name="preferencesCategory" checked={s.preferencesCategory} />
							Show a “Preferences” choice (only if your store uses cookies that remember settings)</label
						>
						<label class="flex items-center gap-2"
							><input type="checkbox" name="noticeOptOut" checked={s.noticeBanner.optOut} /> Show a short
							notice where people can opt out (most US privacy states, Canada)</label
						>
						<label class="flex items-center gap-2"
							><input type="checkbox" name="noticeNotice" checked={s.noticeBanner.notice} /> Also show
							a notice where no cookie law applies</label
						>
					</div>
				</Card>

				<Card title="Colors">
					<label class="mb-3 flex items-center gap-2 text-sm"
						><input type="checkbox" name="storeTheme" bind:checked={storeTheme} /> Use my store theme</label
					>
					{#if !storeTheme}
						<div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
							{#each [['bg', 'Background', '#ffffff'], ['fg', 'Text', '#18181b'], ['primary', 'Button', '#18181b'], ['primaryFg', 'Button text', '#ffffff']] as [k, l, d] (k)}
								<label class="block"
									><span class={label}>{l}</span><input
										type="color"
										name="theme_{k}"
										value={(s.theme as Record<string, string>)[k] || d}
										class="h-9 w-full rounded border border-zinc-300"
									/></label
								>
							{/each}
						</div>
					{/if}
				</Card>

				<Card title="Wording">
					<div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
						<span>Language:</span>
						{#each BANNER_LANGUAGES as l (l.code)}
							<a
								href="?tab=banner&lang={l.code}"
								class="rounded px-2 py-0.5 {l.code === data.lang
									? 'bg-zinc-900 text-white'
									: 'bg-zinc-100 text-zinc-700'}">{l.name}</a
							>
						{/each}
					</div>
					<p class="mb-3 text-xs text-zinc-500">
						Editing {langName}. Leave a box empty to keep the built-in wording. The banner comes in
						20 languages; the others use built-in translations unless you edit them here.
					</p>
					<div class="space-y-3">
						{#each EDITABLE_TEXTS as t (t.key)}
							<div>
								<label class={label} for="text_{t.key}">{t.label}</label>
								{#if t.long}
									<textarea id="text_{t.key}" name="text_{t.key}" rows="3" class={input}
										>{langTexts[t.key] ?? ''}</textarea
									>
								{:else}
									<input
										id="text_{t.key}"
										name="text_{t.key}"
										class={input}
										value={langTexts[t.key] ?? ''}
									/>
								{/if}
							</div>
						{/each}
					</div>
					<p class="mt-3 text-xs text-zinc-500">
						Changing the wording shows the banner to everyone again, so their answer matches what
						they read.
					</p>
				</Card>
				<button class={btnPrimary}>Save banner</button>
			</form>
		</div>

		<div class="space-y-4">
			<Card title="See it on your store">
				<p class="mb-3 text-sm text-zinc-600">
					Opens your store in a new tab. Only you see the preview.
				</p>
				<div class="flex flex-col gap-2">
					<a class={btn} target="_blank" rel="noopener" href="/?consent_preview=opt-in"
						>Preview on my store (EU visitor)</a
					>
					<a class={btn} target="_blank" rel="noopener" href="/?consent_preview=opt-out-gpc"
						>Preview on my store (California visitor)</a
					>
					<a
						class={btn}
						target="_blank"
						rel="noopener"
						href="/?consent_preview=opt-in&consent_lang=de">Preview on my store (in German)</a
					>
				</div>
			</Card>
			<Card title="Region rules are automatic">
				<p class="text-sm text-zinc-600">
					Visitors from the EU, UK, Brazil and other places that require it are asked first. In most
					US privacy states they can opt out, and the browser privacy signal is always respected.
					Elsewhere they are simply told.
				</p>
				<p class="mt-2 text-sm">
					<a class="underline" href="/admin/ads/tracking"
						>Ask first in more countries (Ads → Tracking)</a
					>
				</p>
			</Card>
			<Card title="Ask everyone again">
				<p class="mb-3 text-sm text-zinc-600">
					Shows the banner again to every visitor, for example after you add a new ad or tracking
					tool. Now on version {s.rev}.
				</p>
				<form method="POST" action="?/askAgain" use:enhance>
					<button class={btnDanger}>Ask everyone again</button>
				</form>
			</Card>
		</div>
	</div>
{:else if data.tab === 'cookies'}
	<Card title="Cookies your store uses">
		<p class="mb-3 text-sm text-zinc-600">
			Shoppers see this list when they open the cookie settings. Keep it true to what your store
			sets.
		</p>
		<form method="POST" action="?/cookies" use:enhance>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-zinc-500">
						<tr
							><th class="p-1">Cookie name</th><th class="p-1">Shown to shoppers as</th><th
								class="p-1">Provider</th
							><th class="p-1">Type</th><th class="p-1">What it does</th><th class="p-1"
								>How long</th
							><th class="p-1">Remove</th></tr
						>
					</thead>
					<tbody>
						{#each [...s.cookies, { name: '', label: '', provider: '', category: 'necessary', purpose: '', duration: '' }] as c, i (i)}
							<tr class="align-top">
								<td class="p-1"
									><input
										class={input}
										name="name_{i}"
										value={c.name}
										placeholder={i === s.cookies.length ? 'Add a cookie' : ''}
									/></td
								>
								<td class="p-1"
									><input
										class={input}
										name="label_{i}"
										value={c.label ?? ''}
										maxlength="80"
										placeholder="Your shopping bag"
										aria-label="Plain-words name for {c.name || 'the new cookie'}"
									/></td
								>
								<td class="p-1"><input class={input} name="provider_{i}" value={c.provider} /></td>
								<td class="p-1"
									><select class={input} name="category_{i}">
										{#each CONSENT_CATEGORIES as cat (cat)}
											<option value={cat} selected={c.category === cat}
												>{CATEGORY_LABEL[cat]}</option
											>
										{/each}
									</select></td
								>
								<td class="p-1"><input class={input} name="purpose_{i}" value={c.purpose} /></td>
								<td class="p-1"><input class={input} name="duration_{i}" value={c.duration} /></td>
								<td class="p-1 text-center"
									>{#if i < s.cookies.length}<input
											type="checkbox"
											name="remove_{i}"
											aria-label="Remove {c.name}"
										/>{/if}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="mt-2 text-xs text-zinc-500">
				Fill in the last row to add a cookie. Shoppers see the plain-words name with the cookie name
				under it. Saving other changes asks visitors again; changing only plain-words names does
				not.
			</p>
			<div class="mt-3 flex gap-2">
				<button class={btnPrimary}>Save cookie list</button>
			</div>
		</form>
		<form method="POST" action="?/resetCookies" use:enhance class="mt-2">
			<button class={btn}>Reset to defaults</button>
		</form>
	</Card>
{:else if data.tab === 'records'}
	<div class="grid gap-4 lg:grid-cols-3">
		<Card title="Look up a choice" class="lg:col-span-2">
			<form method="GET" class="flex gap-2">
				<input type="hidden" name="tab" value="records" />
				<input
					class={input}
					name="id"
					value={data.lookup ?? ''}
					placeholder="Reference, e.g. k3J9x_aB2cD4eF6g"
				/>
				<button class={btn}>Find</button>
			</form>
			<p class="mt-1 text-xs text-zinc-500">
				Shoppers find their reference on the “Your privacy choices” page.
			</p>
			{#if !data.lookupValid}
				<p class="mt-2 text-sm text-red-700">
					That doesn’t look like a reference (16 letters and numbers).
				</p>
			{/if}
		</Card>
		<Card title="Download">
			<form method="GET" action="/admin/privacy/records.csv" class="space-y-2 text-sm">
				<label class="block"
					><span class={label}>From</span><input
						class={input}
						type="date"
						name="from"
						value={monthAgo}
					/></label
				>
				<label class="block"
					><span class={label}>To</span><input
						class={input}
						type="date"
						name="to"
						value={today}
					/></label
				>
				<button class={btn}>Download spreadsheet</button>
			</form>
		</Card>
	</div>

	<Card title={data.lookup ? 'Records for this reference' : 'Latest 100 choices'} class="mt-4">
		{#if data.records.length === 0}
			<Empty
				title={data.lookup ? 'No records for this reference' : 'No choices recorded yet'}
				text={data.lookup
					? 'Check the reference with the shopper. Records older than 5 years are deleted.'
					: 'Each time a visitor answers the banner, a record appears here as proof of what they chose.'}
			/>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-zinc-500">
						<tr
							><th class="p-2">When</th><th class="p-2">Reference</th><th class="p-2">Choice</th><th
								class="p-2">Statistics</th
							><th class="p-2">Marketing</th><th class="p-2">Rules that applied</th><th class="p-2"
								>Place</th
							><th class="p-2">Browser</th><th class="p-2">Browser privacy signal</th><th
								class="p-2">Website</th
							></tr
						>
					</thead>
					<tbody class="divide-y divide-zinc-100">
						{#each data.records as r (r.id)}
							<tr>
								<td class="p-2 whitespace-nowrap">{fmtDate(r.createdAt, true)}</td>
								<td class="p-2 font-mono text-xs">{r.consentId}</td>
								<td class="p-2">{ACTION_LABEL[r.action] ?? 'Other'}</td>
								<td class="p-2">{r.analytics ? 'Yes' : 'No'}</td>
								<td class="p-2">{r.marketing ? 'Yes' : 'No'}</td>
								<td class="p-2">{MODE_LABEL[r.mode] ?? 'Other'}</td>
								<td class="p-2">{placeName(r.country, r.regionCode)}</td>
								<td class="p-2">{browserName(r.userAgent)}</td>
								<td class="p-2">{r.gpc ? 'Yes' : 'No'}</td>
								<td class="p-2">{r.website}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		<p class="mt-3 text-xs text-zinc-500">
			Records are kept {data.retentionYears} years, then deleted automatically. No IP addresses are stored.
		</p>
	</Card>
{/if}
