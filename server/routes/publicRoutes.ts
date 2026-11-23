import { Router } from 'express';
import { isDatabaseConnectionError } from '../db/pool.ts';
import { getStore } from '../db/store.ts';

const router = Router();

router.get('/overview', async (_req, res) => {
  try {
    const store = getStore();
    const [categories, guidelines, offices, faqs, settings] = await Promise.all([
      store.listCategories(),
      store.listGuidelines(),
      store.listOffices(),
      store.listFaqs(true),
      store.getSettings(),
    ]);

    res.json({
      categories: categories.filter((c) => c.isActive),
      guidelines,
      offices: offices.filter((o) => o.isActive),
      faqs,
      settings,
    });
  } catch (err) {
    console.error('Public overview failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to load BAUST SAMS catalog.' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const categories = await getStore().listCategories();
    res.json({ categories: categories.filter((c) => c.isActive) });
  } catch (err) {
    console.error('Public categories failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to load application categories.' });
  }
});

router.get('/categories/:id', async (req, res) => {
  try {
    const category = await getStore().getCategoryById(req.params.id);
    if (!category || !category.isActive) {
      res.status(404).json({ error: 'Application category not found.' });
      return;
    }
    const guidelines = await getStore().listGuidelines();
    const guideline = guidelines.find((g) => g.categoryId === category.id) ?? null;
    res.json({ category, guideline });
  } catch (err) {
    console.error('Public category detail failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to load category details.' });
  }
});

router.get('/guidelines', async (_req, res) => {
  try {
    const guidelines = await getStore().listGuidelines();
    res.json({ guidelines });
  } catch (err) {
    console.error('Public guidelines failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to load guidelines.' });
  }
});

router.get('/faqs', async (_req, res) => {
  try {
    const faqs = await getStore().listFaqs(true);
    res.json({ faqs });
  } catch (err) {
    console.error('Public FAQs failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to load FAQs.' });
  }
});

export default router;
