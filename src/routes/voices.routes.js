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
        name: 'Ald (México - Masculina Rápida)',
        lang: 'es-MX',
        quality: 'medium',
        recommended_for: 'Baja latencia y respuestas en tiempo real'
      },
      {
        id: 'es_MX-claude-high',
        name: 'Claude (México - Masculina Alta Fidelidad)',
        lang: 'es-MX',
        quality: 'high',
        recommended_for: 'Máxima calidad de audio'
      },
      {
        id: 'es_ES-davefx-medium',
        name: 'Dave (España - Masculina)',
        lang: 'es-ES',
        quality: 'medium',
        recommended_for: 'Acento peninsular masculino'
      },
      {
        id: 'es_ES-carlfm-x_low',
        name: 'Carlfm (España - Masculina Ultra Ligera)',
        lang: 'es-ES',
        quality: 'x_low',
        recommended_for: 'Ultra bajo consumo de memoria'
      },
      {
        id: 'es_ES-sharvard-medium',
        name: 'Sharvard (España - Femenina)',
        lang: 'es-ES',
        quality: 'medium',
        recommended_for: 'Acento peninsular femenino'
      },
      {
        id: 'es_AR-css10-medium',
        name: 'CSS10 (Argentina - Femenina)',
        lang: 'es-AR',
        quality: 'medium',
        recommended_for: 'Acento rioplatense'
      }
    ]
  });
});

export default router;
