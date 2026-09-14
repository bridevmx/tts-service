import { Router } from 'express';
import { requirePocketbaseAuth } from '../middleware/pb-auth.js';
import { config } from '../config.js';

const router = Router();

router.get('/voices', requirePocketbaseAuth, (req, res) => {
  res.status(200).json({
    default: config.defaultVoice,
    default_model: 'piper',
    default_version: 'v1',
    models: [
      { id: 'piper', name: 'Piper TTS (Ultra Rápido - 0ms inicio)', default_version: 'v1' },
      { id: 'kokoro', name: 'Kokoro-82M (Alta Calidad HD)', default_version: 'v1' },
      { id: 'melotts', name: 'MeloTTS (VITS2 Nativo)', default_version: 'v1' }
    ],
    versions: ['v1', 'latest'],
    voices: [
      {
        id: 'es_MX-ald-medium',
        name: 'Ald (México - Masculina Rápida)',
        model: 'piper',
        version: 'v1',
        lang: 'es-MX',
        quality: 'medium',
        recommended_for: 'Baja latencia y respuestas en tiempo real'
      },
      {
        id: 'es_MX-claude-high',
        name: 'Claude (México - Masculina Alta Fidelidad)',
        model: 'piper',
        version: 'v1',
        lang: 'es-MX',
        quality: 'high',
        recommended_for: 'Máxima calidad de audio'
      },
      {
        id: 'es_ES-davefx-medium',
        name: 'Dave (España - Masculina)',
        model: 'piper',
        version: 'v1',
        lang: 'es-ES',
        quality: 'medium',
        recommended_for: 'Acento peninsular masculino'
      },
      {
        id: 'es_ES-carlfm-x_low',
        name: 'Carlfm (España - Masculina Ultra Ligera)',
        model: 'piper',
        version: 'v1',
        lang: 'es-ES',
        quality: 'x_low',
        recommended_for: 'Ultra bajo consumo de memoria'
      },
      {
        id: 'es_ES-sharvard-medium',
        name: 'Sharvard (España - Femenina)',
        model: 'piper',
        version: 'v1',
        lang: 'es-ES',
        quality: 'medium',
        recommended_for: 'Acento peninsular femenino'
      },
      {
        id: 'es_AR-css10-medium',
        name: 'CSS10 (Argentina - Femenina)',
        model: 'piper',
        version: 'v1',
        lang: 'es-AR',
        quality: 'medium',
        recommended_for: 'Acento rioplatense'
      },
      {
        id: 'es-MX-kokoro',
        name: 'Kokoro Alex/Dora (México - Calidad HD)',
        model: 'kokoro',
        version: 'v1',
        lang: 'es-MX',
        quality: 'hd',
        recommended_for: 'Síntesis expresiva de alta calidad'
      },
      {
        id: 'es-ES-melo',
        name: 'MeloTTS Spanish (España/LATAM)',
        model: 'melotts',
        version: 'v1',
        lang: 'es-ES',
        quality: 'high',
        recommended_for: 'Voz limpia VITS2 en español'
      }
    ]
  });
});

export default router;
