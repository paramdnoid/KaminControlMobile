import type { ConverterResult } from './genesisConverter';

export type GenesisConverterBridge = {
  pickZip: () => Promise<string | null>;
  convertZip: (zipPath: string) => Promise<ConverterResult>;
  saveBundle: (sourcePath: string, bundle: ConverterResult['bundle']) => Promise<string | null>;
};
