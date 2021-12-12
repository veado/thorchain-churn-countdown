<script lang="ts">
  import Countdown from "./Countdown.svelte";
</script>

<div class="grid grid-flow-col gap-5 text-center auto-cols-max">
  <Countdown label="days" value={22} />
  <Countdown label="hours" value={3} />
  <Countdown label="minutes" value={1} />
  <Countdown label="seconds" value={16} />
</div>
