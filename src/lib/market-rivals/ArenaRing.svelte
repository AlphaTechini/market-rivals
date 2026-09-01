<script lang="ts">
	type Props = {
		label: string;
		value: string;
		detail: string;
	};

	let { label, value, detail }: Props = $props();
</script>

<div class="arena-ring">
	<div class="ring-copy">
		<small>{label}</small>
		<strong>{value}</strong>
		<small>{detail}</small>
	</div>
</div>
