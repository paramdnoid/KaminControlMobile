import type { GenesisConverterBridge } from './rendererTypes';

declare global {
  interface Window {
    genesisConverter: GenesisConverterBridge;
  }
}
