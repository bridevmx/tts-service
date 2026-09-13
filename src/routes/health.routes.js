import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'tts-api',
    timestamp: new Date().toISOString()
  });
});

export default router;
