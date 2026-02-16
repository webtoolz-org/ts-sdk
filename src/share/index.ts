export {
  compress,
  decompress,
  fitsInPayload,
  MAX_PAYLOAD_SIZE,
  MAX_DECOMPRESSED_SIZE,
  PAYLOAD_WRAPPER_OVERHEAD,
} from "./codec";
export type {
  CompressResult,
  CompressSuccess,
  CompressFailure,
  DecompressResult,
  DecompressSuccess,
  DecompressFailure,
} from "./codec";
