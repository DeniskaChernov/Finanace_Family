import { Router } from 'express';
import webpush from 'web-push';
import pool from '../db.js';

const router = Router();

webpush.setVapidDetails(
  'mailto:app@family-budget.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Save subscription
router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.id;
  const familyId = req.user.family_id;
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, family_id, subscription)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET subscription = $3`,
      [userId, familyId, JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove subscription
router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// Send notification to all family members (internal use)
export async function sendFamilyNotification(familyId, title, body, data = {}) {
  try {
    const { rows } = await pool.query(
      'SELECT subscription FROM push_subscriptions WHERE family_id = $1',
      [familyId]
    );
    const payload = JSON.stringify({ title, body, data, icon: '/icons/icon-192.png', badge: '/icons/badge-72.png' });
    await Promise.allSettled(
      rows.map(row => webpush.sendNotification(JSON.parse(row.subscription), payload))
    );
  } catch (e) {
    console.error('Push error:', e.message);
  }
}

export default router;
