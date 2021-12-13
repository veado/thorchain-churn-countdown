# THORChain Churn Countdown

https://veado.github.io/thorchain-churn-countdown

![Preview](./wiki/preview.gif)

## How does it work

The app fetches data from `Midgard` (churn interval, next churn) and subscribes to [THORChain](https://docs.thorchain.org/)'s websocket events (powered by [Tendermint](https://tendermint.com/)) to get latest block data (block height, block time). Since block times are different, it adjusts values behind the scenes to get an average block time. Data can be displayed in human or block time.

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
