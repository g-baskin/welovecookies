<script lang="ts">
	// We Love Cookies admin: the shared header and tab bar for every Privacy & cookies page.
	import PageHeader from '#lib/admin/components/PageHeader.svelte';
	import Tabs from '#lib/admin/components/Tabs.svelte';

	let { current, openRequests }: { current: string; openRequests?: number } = $props();
	const tabs = $derived([
		{ key: 'overview', label: 'Overview', href: '/admin/privacy?tab=overview' },
		{ key: 'banner', label: 'Banner', href: '/admin/privacy?tab=banner' },
		{ key: 'cookies', label: 'Cookies', href: '/admin/privacy?tab=cookies' },
		{ key: 'records', label: 'Records', href: '/admin/privacy?tab=records' },
		{
			key: 'requests',
			label: 'Requests',
			href: '/admin/privacy/requests',
			count: openRequests ? openRequests : undefined
		},
		{ key: 'sites', label: 'Other websites', href: '/admin/privacy/sites' }
	]);
</script>

<PageHeader
	title="Privacy & cookies"
	subtitle="Your cookie banner asks visitors the right way for where they live. It works on its own; change it here if you want."
/>

<div class="mb-4 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
	<Tabs {tabs} {current} />
</div>
