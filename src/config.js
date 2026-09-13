import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  pocketbaseUrl: (process.env.POCKETBASE_URL || 'http://localhost:8090').replace(/\/$/, ''),
  pocketbaseCollection: process.env.POCKETBASE_COLLECTION || 'users',
  piperUrl: process.env.PIPER_URL || 'http://127.0.0.1:5000/v1/audio/speech',
  defaultVoice: process.env.DEFAULT_VOICE || 'es_MX-ald-medium'
};
