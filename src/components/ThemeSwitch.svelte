<script lang="ts">
  import { theme, updateTheme } from "../stores/theme";

  import { Moon, Sun } from "svelte-hero-icons";
  import Icon from "svelte-hero-icons/Icon.svelte";
  import { Theme } from "../stores/types";
</script>

<div class="flex-none">
  {#if $theme === Theme.LIGHT}
    <button
      on:click={() => updateTheme(Theme.DARK)}
      class="btn btn-circle btn-ghost"
    >
      <Icon src={Moon} size="24" solid class="text-yellow-500" />
    </button>
  {:else}
    <button
      on:click={() => updateTheme(Theme.LIGHT)}
      class="btn btn-circle btn-ghost"
    >
      <Icon src={Sun} size="24" solid class="text-white-500" />
    </button>
  {/if}
</div>
