<script lang="ts">
  import type * as FP from "fp-ts/lib/function";

  export let error: Error;
  export let title: string;
  export let callback: FP.Lazy<void>;

    let className = "";
  export { className as class };
</script>

<div class="alert shadow-lg {className}">
  <div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      class="stroke-warning flex-shrink-0 w-6 h-6"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      /></svg
    >
    <div>
      <h3 class="font-bold">{title}</h3>
      <div class="text-xs">{error.message || error.toString()}</div>
    </div>
  </div>
  <div class="flex-none">
    <button class="btn btn-sm btn-warning" on:click={() => callback()}
      >Retry</button
    >
  </div>
</div>
