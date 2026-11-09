<script lang="ts">
	import { onMount } from 'svelte';
	import { createConsent, type ConsentManager } from '../consent.ts';
	import type { PostHogLike } from '../signals.ts';
	import type { ConsentConfig } from '../types.ts';

	let {
		config,
		posthog,
		manager = $bindable(null),
		onready
	}: {
		config: ConsentConfig;
		posthog?: PostHogLike | null;
		manager?: ConsentManager | null;
		onready?: (m: ConsentManager) => void;
	} = $props();

	onMount(() => {
		const m = createConsent(config, { posthog });
		manager = m;
		onready?.(m);
		return () => {
			m.destroy();
			manager = null;
		};
	});
</script>
