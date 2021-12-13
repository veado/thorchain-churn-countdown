<script lang="ts">
  import { onMount } from "svelte";
  import CountdownTime from "./components/CountdownTime.svelte";
  import CountdownBlock from "./components/CountdownBlock.svelte";
  import logo from "./assets/thorchain.png";

  import { Cube, Tag } from "svelte-hero-icons";

  import Icon from "svelte-hero-icons/Icon.svelte";
  import ThemeSwitch from "./components/ThemeSwitch.svelte";
  import { initTheme } from "./stores/theme";
  import {
    blockHeight$,
    churnInterval$,
    nextChurn$,
    blockTime$,
    blocksLeft$,
    timeLeft$,
    percentLeft$,
    churnIntervalTime$,
  } from "./stores/churn";

  type Time = "human" | "block";

  let time: Time = "human";

  onMount(async () => {
    initTheme();
  });
</script>

<div class="flex flex-col h-screen">
  <div class="navbar mb-2 shadow-lg bg-neutral text-neutral-content">
    <div class="flex-1 px-2 mx-2 py-2">
      <button class="btn btn-circle btn-ghost">
        <img src={logo} alt="logo" class="mask mask-circle" />
      </button>
    </div>
    <ThemeSwitch />
  </div>
  <main class="grid justify-center pt-8 flex-grow">
    <div>
      <div class="card text-center shadow-2xl min-w-[36em]">
        <div class="card-body">
          <h1 class="text-4xl font-bold pt-2 pb-8">CHURN COUNTDOWN</h1>
          <!-- <div>time left: {JSON.stringify($timeLeft$)}</div> -->
          {#if time === "human"}
            <CountdownTime time={$timeLeft$} />
          {:else}
            <CountdownBlock blocks={$blocksLeft$} />
          {/if}
          <div class="pt-8">
            <div
              data-tip="{$percentLeft$.toFixed(2)}% left"
              class="tooltip w-full tooltip-bottom"
            >
              <progress
                class="progress progress-primary h-8"
                value={$percentLeft$}
                max="100"
              />
            </div>
          </div>
        </div>

        <div class="w-full shadow stats">
          <div class="stat">
            <div class="stat-figure">
              <Icon src={Cube} size="48" class="outline-none" />
            </div>
            <div class="stat-title">Current block</div>
            <div class="stat-value">{$blockHeight$}</div>
            <div class="stat-desc">~{($blockTime$ / 1000).toFixed(2)} s/b</div>
          </div>
          <div class="stat">
            <div class="stat-figure">
              <Icon src={Tag} size="48" class="outline-none" />
            </div>
            <div class="stat-title">Churn block</div>
            <div class="stat-value">{$nextChurn$}</div>
            <div class="stat-desc">
              Churn interval:
              {#if time === "human"}
                {$churnIntervalTime$.days}d {$churnIntervalTime$.hours}h {$churnIntervalTime$.minutes}m
              {:else}
                {$churnInterval$} blocks
              {/if}
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-center items-center pt-8">
        <div class="btn-group">
          <button
            on:click={() => (time = "human")}
            class="btn btn-lg"
            class:btn-active={time === "human"}>Human<br /> time</button
          >
          <button
            on:click={() => (time = "block")}
            class="btn btn-lg"
            class:btn-active={time === "block"}>Block<br />time</button
          >
        </div>
      </div>
    </div>
  </main>
  <footer class="mt-20 p-4 footer text-base-content footer-center">
    <!-- GH -->
    <button class="btn btn-circle btn-ghost drawer-button">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        class="inline-block w-6 h-6 fill-current"
        ><path
          d="M256,32C132.3,32,32,134.9,32,261.7c0,101.5,64.2,187.5,153.2,217.9a17.56,17.56,0,0,0,3.8.4c8.3,0,11.5-6.1,11.5-11.4,0-5.5-.2-19.9-.3-39.1a102.4,102.4,0,0,1-22.6,2.7c-43.1,0-52.9-33.5-52.9-33.5-10.2-26.5-24.9-33.6-24.9-33.6-19.5-13.7-.1-14.1,1.4-14.1h.1c22.5,2,34.3,23.8,34.3,23.8,11.2,19.6,26.2,25.1,39.6,25.1a63,63,0,0,0,25.6-6c2-14.8,7.8-24.9,14.2-30.7-49.7-5.8-102-25.5-102-113.5,0-25.1,8.7-45.6,23-61.6-2.3-5.8-10-29.2,2.2-60.8a18.64,18.64,0,0,1,5-.5c8.1,0,26.4,3.1,56.6,24.1a208.21,208.21,0,0,1,112.2,0c30.2-21,48.5-24.1,56.6-24.1a18.64,18.64,0,0,1,5,.5c12.2,31.6,4.5,55,2.2,60.8,14.3,16.1,23,36.6,23,61.6,0,88.2-52.4,107.6-102.3,113.3,8,7.1,15.2,21.1,15.2,42.5,0,30.7-.3,55.5-.3,63,0,5.4,3.1,11.5,11.4,11.5a19.35,19.35,0,0,0,4-.4C415.9,449.2,480,363.1,480,261.7,480,134.9,379.7,32,256,32Z"
        /></svg
      >
    </button>
  </footer>
</div>