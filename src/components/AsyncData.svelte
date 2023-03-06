<script lang="ts">
  import * as RD from "@devexperts/remote-data-ts";
  import * as FP from "fp-ts/lib/function";

  export let loading: ConstructorOfATypedSvelteComponent;
  export let error: ConstructorOfATypedSvelteComponent = null;
  export let success: ConstructorOfATypedSvelteComponent = null;
  let className = "";
  export { className as class };

  type T = $$Generic;
  export let data: RD.RemoteData<Error, T>;

  // error data
  $: _error = FP.pipe(
    data,
    RD.fold(
      () => null,
      () => null,
      FP.identity,
      () => null
    )
  );

  // success data
  $: _result = FP.pipe(
    data,
    RD.fold(
      () => null,
      () => null,
      () => null,
      FP.identity
    )
  );
</script>

<div class={className}>
  {#if RD.isPending(data) || RD.isInitial(data)}
    {#if loading}
      <svelte:component this={loading} />
    {:else}
      'loading'
    {/if}
  {:else if RD.isFailure(data)}
    {#if loading}
      <svelte:component this={error} error={_error} />
    {:else if _error}
      <!-- error message -->
      {_error.message || _error.toString()}
    {/if}
  {:else if RD.isSuccess(data)}
    {#if success}
      <svelte:component this={success} data={_result} />
    {:else if _result}
      <!-- result as string -->
      {_result.toString()}
    {/if}
  {/if}
</div>
