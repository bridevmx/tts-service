import { Router } from 'express';
import { requirePocketbaseAuth } from '../middleware/pb-auth.js';
import { config } from '../config.js';

const router = Router();

router.get('/voices', requirePocketbaseAuth, (req, res) => {
  res.status(200).json({
    default: config.defaultVoice,
    recommended_fast: 'es_MX-ald-medium',
    voices: [
      {
        id: 'es_MX-ald-medium',
        name: 'Ald (México - Rápido)',
        lang: 'es-MX',
        quality: 'medium',
        recommended_for: 'Baja latencia y textos largos'
      },
      {
        id: 'es_MX-claude-high',
        name: 'Claude (México - Alta fidelidad)',
        lang: 'es-MX',
        quality: 'high',
        recommended_for: 'Textos cortos, máxima calidad'
      },
      {
        id: 'es_ES-davefx-medium',
        name: 'Dave (España)',
        lang: 'es-ES',
        quality: 'medium',
        recommended_for: 'Acento peninsular'
      }
    ]
  });
});

export default router;
