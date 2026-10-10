import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';

let authToken = '';
let testUserId = '';
let testWorkspaceId = '';
let testMeetingId = '';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('IntellMeet REST API Integration Test Suite', () => {
  const randomSuffix = Math.floor(Math.random() * 100000);
  const testUser = {
    name: `Test Engineer ${randomSuffix}`,
    email: `engineer${randomSuffix}@intellmeet.io`,
    password: 'Password123!',
    role: 'member',
  };

  test('POST /api/auth/register - Successfully register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    authToken = res.body.token;
    testUserId = res.body.user.id;
    testWorkspaceId = res.body.user.defaultWorkspaceId;
  });

  test('POST /api/auth/login - Successfully authenticate registered user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('GET /api/auth/me - Retrieve current authenticated profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  test('GET /api/workspaces - Fetch user workspaces', async () => {
    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.workspaces)).toBe(true);
  });

  test('POST /api/meetings - Create instant or scheduled meeting', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Sprint Planning & Architecture Sync',
        description: 'Quarterly architecture and AI integration review',
        workspaceId: testWorkspaceId,
        isInstant: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.meeting.meetingCode).toBeDefined();
    testMeetingId = res.body.meeting._id;
  });

  test('GET /api/meetings/:id - Retrieve meeting details', async () => {
    const res = await request(app)
      .get(`/api/meetings/${testMeetingId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meeting.title).toBe('Sprint Planning & Architecture Sync');
  });

  test('POST /api/ai/transcribe & /api/ai/summarize - Meeting intelligence pipeline', async () => {
    const transcriptText = `
Alex: Welcome everyone to the architecture sync. Let's discuss WebRTC scaling and our OpenAI pipeline.
Sarah: I have completed the Socket.io signaling implementation. Sarah will deploy the STUN/TURN server configuration by Friday.
David: That looks great. We agreed that all video conferencing must use end-to-end peer connections with fallback.
Alex: Agreed. David, please review the security headers and rate limits before next Tuesday.
David: Will do. I will submit the security review PR tomorrow.
    `;

    // 1. Submit transcript
    const transRes = await request(app)
      .post('/api/ai/transcribe')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        meetingId: testMeetingId,
        rawText: transcriptText,
      });
    expect(transRes.status).toBe(200);

    // 2. Generate summary & action items
    const sumRes = await request(app)
      .post('/api/ai/summarize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        meetingId: testMeetingId,
      });
    expect(sumRes.status).toBe(200);
    expect(sumRes.body.success).toBe(true);
    expect(sumRes.body.summary).toBeDefined();
    expect(sumRes.body.actionItems.length).toBeGreaterThan(0);
  });

  test('GET /api/action-items - Fetch generated action items', async () => {
    const res = await request(app)
      .get('/api/action-items')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.actionItems.length).toBeGreaterThan(0);

    // Update status of first item
    const firstItemId = res.body.actionItems[0]._id;
    const patchRes = await request(app)
      .patch(`/api/action-items/${firstItemId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'completed' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.actionItem.status).toBe('completed');
  });

  test('GET /api/meetings/stats/dashboard - Verify dashboard metrics', async () => {
    const res = await request(app)
      .get('/api/meetings/stats/dashboard')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.totalMeetings).toBeGreaterThanOrEqual(1);
  });
});
