import { createSession } from './session';
const dispatch = createSession(data => self.postMessage(data));
self.onmessage = ({ data }) => dispatch(data);
