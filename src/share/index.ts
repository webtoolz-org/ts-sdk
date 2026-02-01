// Types
export type { EncodeResult, DecodeResult, SharePayload } from "./types";
export { MAX_PAYLOAD_SIZE, MAX_DECOMPRESSED_SIZE } from "./types";

// Encoder
export { encode, decode, isShareableSize } from "./encoder";
