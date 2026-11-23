import { Router } from 'express';
import { getStore } from '../db/store.ts';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifications = await getStore().listNotifications(req.authUser!.id);
    res.json({ notifications });
  } catch (err) {
    console.error('List notifications failed:', err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

router.patch('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const ok = await getStore().setNotificationRead(String(req.params.id), req.authUser!.id, true);
    if (!ok) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark notification read failed:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.patch('/:id/unread', requireAuth, async (req: AuthRequest, res) => {
  try {
    const ok = await getStore().setNotificationRead(String(req.params.id), req.authUser!.id, false);
    if (!ok) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark notification unread failed:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.post('/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    await getStore().markAllNotificationsRead(req.authUser!.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark all notifications read failed:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

export default router;
