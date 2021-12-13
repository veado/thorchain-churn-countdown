# THORChain Churn Countdown

https://veado.github.io/thorchain-churn-countdown

![Preview](./wiki/preview.gif)

## How does it work

The app fetches data from `Midgard` (churn interval, last churn) and subscribes to THORChains (powered by Tendermint's) websocket events to get latest block data (block height, block time). Since block time is different, it adjusts the block time behind the scenes to get an average value.

## Build with (in alphabetical order)

- [dayjs](https://github.com/iamkun/dayjs)
- [fp-ts](https://gcanti.github.io/fp-ts/)
- [RxJS](https://rxjs.dev)
- [Svelte](svelte.dev)
- [DaisyUI](https://daisyui.com)
- [Vite](https://vitejs.dev/)
- [TypeScript](typescriptlang.org/)

## Licence

[MIT](./LICENSE)
