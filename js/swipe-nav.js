/** Site-wide grab-pan. Same page; horizontal offset persists. */

import { bindGrabPan } from "./gestures.js";

export function mountSwipeNav() {
  return bindGrabPan(document.body);
}
