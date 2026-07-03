import { PixelateCensor } from './PixelateCensor.js';
import { PixelateOpacityCensor } from './PixelateOpacityCensor.js';
import { BlackoutCensor } from './BlackoutCensor.js';
import { FakeTextCensor } from './FakeTextCensor.js';

/**
 * CensorRegistry
 * ---------------
 * Ordered list of every available censor method. This is the single
 * place that needs to change to add, remove, or reorder methods —
 * the toolbar UI and CensorEngine both read from here rather than
 * hardcoding method names.
 */
export const CENSOR_METHODS = [
  PixelateCensor,
  PixelateOpacityCensor,
  BlackoutCensor,
  FakeTextCensor,
];

export function getCensorMethodById(id) {
  return CENSOR_METHODS.find((m) => m.id === id) || CENSOR_METHODS[0];
}
