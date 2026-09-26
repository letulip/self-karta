import { exportFileName } from './exportMd';
import { downloadText } from './share';
import { serializeBackup } from './storage';
import { markBackup, state } from './store';

export function downloadBackup() {
  downloadText(serializeBackup(state), exportFileName(state, 'json'), 'application/json');
  markBackup();
}
