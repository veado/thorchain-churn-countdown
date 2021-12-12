<script lang="ts">
  export let value: number = 0;
  export let label: string = "";
</script>

<div class="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
  <span class="font-mono text-8xl countdown"
    ><span style="--value: {value};" /></span
  >
  {label}
</div>
