import '../magister/configure-diagnostics';
import '../magister/debug-worker';
import '../magister/auth-worker';
import '../magister/update-worker';
import {authorizeCommand} from './commands';
import {registerStorageWorker} from '../../../shared/state/worker';
registerStorageWorker(authorizeCommand);
