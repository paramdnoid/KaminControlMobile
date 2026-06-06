import type { ConverterResult } from './genesisConverter';

export type GenesisConverterBridge = {
  pickZip: () => Promise<string | null>;
  convertZip: (zipPath: string) => Promise<ConverterResult>;
  saveExportFolder: (sourcePath: string, bundle: ConverterResult['bundle']) => Promise<string | null>;
  saveTransportZip: (sourcePath: string, bundle: ConverterResult['bundle']) => Promise<string | null>;
};
