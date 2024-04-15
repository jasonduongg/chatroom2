// ably.jsx
import Ably from 'ably';

const ablyKey = process.env.REACT_APP_ABLY_KEY;
export const ablyClient = new Ably.Realtime(ablyKey);  // Correct constructor usage
