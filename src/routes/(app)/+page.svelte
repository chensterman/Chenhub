<script lang="ts">
	let { data } = $props();
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl font-bold">Welcome to ChenHub</h1>
	<p class="text-muted-foreground">Signed in as {data.session?.user?.email}</p>
</div>
