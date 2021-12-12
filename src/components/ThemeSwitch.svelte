<script lang="ts">
  import { theme, updateTheme } from "../stores/theme";

  import { Moon, Sun } from "svelte-hero-icons";
  import Icon from "svelte-hero-icons/Icon.svelte";
</script>

<div class="flex-none">
  <p>{$theme}</p>
  {#if $theme === "light"}
    <button
      on:click={() => updateTheme("dark")}
      class="btn btn-square btn-ghost"
    >
      <Icon src={Moon} size="24" solid class="text-yellow-500" />
    </button>
  {:else}
    <button
      on:click={() => updateTheme("light")}
      class="btn btn-square btn-ghost"
    >
      <Icon src={Sun} size="24" solid class="text-white-500" />
    </button>
  {/if}
</div>
