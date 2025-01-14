import { initMongoConnection } from './db/initMongoConnection.js';
import { startServer } from './server.js';
import { checkAndCreateDir } from './utils/checkAndCreateDir.js';
import { TEMP_UPLOAD_DIR, UPLOAD_DIR } from './constants/index.js';

const bootstrap = async () => {
  await initMongoConnection();
  await checkAndCreateDir(TEMP_UPLOAD_DIR);
  await checkAndCreateDir(UPLOAD_DIR);
  startServer();
};

bootstrap();