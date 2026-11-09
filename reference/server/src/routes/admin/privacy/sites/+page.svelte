<script lang="ts">
	import { enhance } from '$app/forms';
	import Card from '#lib/admin/components/Card.svelte';
	import Empty from '#lib/admin/components/Empty.svelte';
	import Flash from '#lib/admin/components/Flash.svelte';
	import PrivacyHeader from '#lib/admin/privacy/PrivacyHeader.svelte';
	import { btn, btnDanger, btnPrimary, input, label } from '#lib/admin/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let copied = $state('');

	async function copy(name: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = name;
		} catch {
			copied = '';
		}
	}
</script>

<PrivacyHeader current="sites" openRequests={data.openRequests} />

<Flash {form} />

<p class="mb-4 text-sm text-zinc-600">
	Use this banner on your other websites. Choices are logged here and follow the same country rules.
</p>

<div class="grid gap-4 lg:grid-cols-3">
	<div class="space-y-4 lg:col-span-2">
		{#if data.sites.length === 0}
			<Card>
				<Empty
					title="No other websites yet"
					text="Have a blog or a second shop? Add it with the form on this page, then paste the code you get into that website."
				/>
			</Card>
		{:else}
			{#each data.sites as s (s.key)}
				<Card title={s.name}>
					<div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
						<span>{s.host}</span>
						<span class={s.enabled ? 'text-emerald-700' : 'text-zinc-500'}
							>{s.enabled ? 'Banner on' : 'Banner off'}</span
						>
						<span>{s.records30} choices in the last 30 days</span>
						{#if s.privacyUrl}<a
								class="underline"
								href={s.privacyUrl}
								target="_blank"
								rel="noopener">Privacy policy</a
							>{/if}
					</div>
					<p class={label}>Code to paste into {s.name}</p>
					<code
						class="block overflow-x-auto rounded-lg bg-zinc-100 p-3 font-mono text-xs whitespace-pre text-zinc-800"
						>{s.snippet}</code
					>
					<ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
						<li>Copy the code.</li>
						<li>Paste it into the head of every page, above your analytics and ad tags.</li>
						<li>Open the website: the banner shows up for new visitors.</li>
					</ol>
					<div class="mt-3 flex flex-wrap gap-2">
						<button type="button" class={btnPrimary} onclick={() => copy(s.name, s.snippet)}
							>{copied === s.name ? 'Copied' : 'Copy code'}</button
						>
						<form method="POST" action="?/toggle" use:enhance>
							<input type="hidden" name="key" value={s.key} />
							<button class={btn}>{s.enabled ? 'Turn off' : 'Turn on'}</button>
						</form>
						<form
							method="POST"
							action="?/remove"
							use:enhance
							onsubmit={(e) => {
								if (!confirm(`Remove ${s.name}? Its past records are kept.`)) e.preventDefault();
							}}
						>
							<input type="hidden" name="key" value={s.key} />
							<button class={btnDanger}>Remove</button>
						</form>
					</div>
				</Card>
			{/each}
		{/if}
	</div>

	<Card title="Add a website">
		<form method="POST" action="?/add" use:enhance class="space-y-3 text-sm">
			<div>
				<label class={label} for="site-name">Name</label>
				<input id="site-name" name="name" class={input} placeholder="My blog" required />
			</div>
			<div>
				<label class={label} for="site-address">Website address</label>
				<input id="site-address" name="address" class={input} placeholder="example.com" required />
				<p class="mt-1 text-xs text-zinc-500">Just the address, without a page after it.</p>
			</div>
			<div>
				<label class={label} for="site-privacy">Privacy policy link (optional)</label>
				<input
					id="site-privacy"
					name="privacy"
					class={input}
					placeholder="https://example.com/privacy"
				/>
			</div>
			<button class={btnPrimary}>Add website</button>
		</form>
		<p class="mt-3 text-xs text-zinc-500">
			The banner on that website uses the wording, cookie list and settings you choose here, and
			takes on that website’s own look.
		</p>
	</Card>
</div>
