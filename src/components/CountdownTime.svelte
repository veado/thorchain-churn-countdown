<script lang="ts">
  import { INITIAL_HUMAN_TIME } from "../stores/const";

  import type { HumanTime } from "../stores/types";

  import Countdown from "./Countdown.svelte";

  export let time: HumanTime = INITIAL_HUMAN_TIME;
</script>

<div class="grid grid-flow-col justify-center gap-5">
  <Countdown label="days" value={time.days} />
  <Countdown label="hours" value={time.hours} />
  <Countdown label="minutes" value={time.minutes} />
  <!-- <Countdown label="seconds" value={time.seconds} /> -->
</div>
