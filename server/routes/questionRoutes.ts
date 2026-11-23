import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db/store.ts';
import { hasStaffPermission, requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

const createQuestionSchema = z.object({
  categoryId: z.string().optional(),
  applicationId: z.string().optional(),
  assignedOfficeId: z.string().min(1),
  subject: z.string().trim().min(4).max(200),
  questionText: z.string().trim().min(10).max(2000),
});

const answerQuestionSchema = z.object({
  status: z.enum(['Unanswered', 'In Progress', 'Answered']),
  answerText: z.string().trim().max(3000).optional(),
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    if (user.role === 'student') {
      const questions = await store.listQuestions({ studentId: user.id });
      res.json({ questions });
      return;
    }
    if (user.role === 'staff') {
      const questions = user.officeId ? await store.listQuestions({ officeId: user.officeId }) : [];
      res.json({ questions });
      return;
    }
    const questions = await store.listQuestions();
    res.json({ questions });
  } catch (err) {
    console.error('List questions failed:', err);
    res.status(500).json({ error: 'Failed to load questions.' });
  }
});

router.post('/', requireAuth, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const parsed = createQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid question input.' });
      return;
    }

    const store = getStore();
    const office = await store.getOfficeById(parsed.data.assignedOfficeId);
    if (!office) {
      res.status(404).json({ error: 'Selected office does not exist.' });
      return;
    }

    if (parsed.data.applicationId) {
      const app = await store.getApplicationById(parsed.data.applicationId);
      if (!app || app.studentId !== user.id) {
        res.status(403).json({ error: 'You may only link your own applications to a question.' });
        return;
      }
    }

    const q = await store.createQuestion({
      id: `qst-${crypto.randomUUID()}`,
      questionCode: await store.nextQuestionCode(new Date().getFullYear()),
      studentId: user.id,
      categoryId: parsed.data.categoryId || undefined,
      applicationId: parsed.data.applicationId || undefined,
      assignedOfficeId: office.id,
      subject: parsed.data.subject,
      questionText: parsed.data.questionText,
    });

    const staffUsers = await store.listUsersByOffice(office.id);
    for (const staff of staffUsers) {
      await store.createNotification({
        userId: staff.id,
        title: `New Student Question ${q.questionCode}`,
        message: `${user.fullName} asked: ${q.subject}`,
        linkPath: '/staff/questions',
      });
    }

    res.status(201).json({ question: q });
  } catch (err) {
    console.error('Create question failed:', err);
    res.status(500).json({ error: 'Failed to submit question.' });
  }
});

router.post('/:id/answer', requireAuth, requireRole('staff', 'admin'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    if (!hasStaffPermission(user, 'can_answer_questions')) {
      res.status(403).json({ error: 'Your account does not have permission to answer student questions.' });
      return;
    }

    const store = getStore();
    const q = await store.getQuestionById(String(req.params.id));
    if (!q) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }
    if (user.role === 'staff' && q.assignedOfficeId !== user.officeId) {
      res.status(403).json({ error: 'This question is assigned to a different office.' });
      return;
    }

    const parsed = answerQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid answer input.' });
      return;
    }
    if (parsed.data.status === 'Answered' && !parsed.data.answerText?.trim()) {
      res.status(400).json({ error: 'Please write an answer before marking the question Answered.' });
      return;
    }

    const updated = await store.updateQuestionAnswer(q.id, {
      status: parsed.data.status,
      answerText: parsed.data.answerText,
      answeredById: user.id,
      answeredByName: user.fullName,
      answeredAt: parsed.data.status === 'Answered' ? new Date().toISOString() : q.answeredAt,
    });

    await store.addAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'QUESTION_UPDATED',
      targetType: 'question',
      targetId: q.questionCode,
      details: `Marked ${parsed.data.status}`,
    });

    await store.createNotification({
      userId: q.studentId,
      title: `Question ${q.questionCode}: ${parsed.data.status}`,
      message: `${user.fullName} responded to "${q.subject}".`,
      linkPath: '/student/questions',
    });

    res.json({ question: updated });
  } catch (err) {
    console.error('Answer question failed:', err);
    res.status(500).json({ error: 'Failed to update question response.' });
  }
});

export default router;
