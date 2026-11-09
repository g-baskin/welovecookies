<script lang="ts">
	/** Ad tracking consent (PRD-017). Shown only where the law asks for consent first. */
	import { page } from '$app/state';
	let open = $state(true);
	let busy = $state(false);

	async function choose(e: SubmitEvent, choice: 'accept' | 'decline') {
		e.preventDefault();
		busy = true;
		try {
			const res = await fetch('/api/consent', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ choice, landing: location.href })
			});
			if (res.ok) open = false;
		} finally {
			busy = false;
		}
	}
</script>

{#if open}
	<div
		role="region"
		aria-label="Privacy choice"
		class="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-theme border border-border bg-bg p-4 font-body text-sm text-fg shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4"
	>
		<p>
			May we remember which ad brought you here, and tell that ad platform if you buy? It helps us
			know which ads work. Nothing is stored or shared unless you accept.
			<a href="/privacy-choices" class="underline">Your privacy choices</a>
		</p>
		<div class="mt-3 flex gap-2">
			<form
				method="POST"
				action="/api/consent"
				onsubmit={(e) => choose(e, 'accept')}
				class="flex-1"
			>
				<input type="hidden" name="choice" value="accept" />
				<input type="hidden" name="landing" value={page.url.pathname + page.url.search} />
				<button
					disabled={busy}
					class="w-full rounded-button bg-primary px-3 py-2 font-medium text-primary-fg"
					>Accept</button
				>
			</form>
			<form
				method="POST"
				action="/api/consent"
				onsubmit={(e) => choose(e, 'decline')}
				class="flex-1"
			>
				<input type="hidden" name="choice" value="decline" />
				<input type="hidden" name="landing" value={page.url.pathname + page.url.search} />
				<button
					disabled={busy}
					class="w-full rounded-button border border-border bg-bg px-3 py-2 font-medium text-fg"
					>Decline</button
				>
			</form>
		</div>
	</div>
{/if}
