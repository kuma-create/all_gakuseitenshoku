import { Hono } from "npm:hono@4.0.0";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";
import { logger } from "npm:hono/logger";
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
}));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Life Chart Events Routes
app.get('/make-server-42a03002/life-events/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const events = await kv.getByPrefix(`life_events:${userId}`);
    
    const parsedEvents = events.map(event => JSON.parse(event));
    return c.json({ success: true, data: parsedEvents });
  } catch (error) {
    console.log('Error fetching life events:', error);
    return c.json({ success: false, error: 'Failed to fetch life events' }, 500);
  }
});

app.post('/make-server-42a03002/life-events/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const eventData = await c.req.json();
    
    const eventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const event = {
      id: eventId,
      userId,
      ...eventData,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`life_events:${userId}:${eventId}`, JSON.stringify(event));
    
    return c.json({ success: true, data: event });
  } catch (error) {
    console.log('Error creating life event:', error);
    return c.json({ success: false, error: 'Failed to create life event' }, 500);
  }
});

app.put('/make-server-42a03002/life-events/:userId/:eventId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const eventId = c.req.param('eventId');
    const updates = await c.req.json();
    
    const existingEvent = await kv.get(`life_events:${userId}:${eventId}`);
    if (!existingEvent) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }
    
    const updatedEvent = {
      ...JSON.parse(existingEvent),
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`life_events:${userId}:${eventId}`, JSON.stringify(updatedEvent));
    
    return c.json({ success: true, data: updatedEvent });
  } catch (error) {
    console.log('Error updating life event:', error);
    return c.json({ success: false, error: 'Failed to update life event' }, 500);
  }
});

app.delete('/make-server-42a03002/life-events/:userId/:eventId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const eventId = c.req.param('eventId');
    
    await kv.del(`life_events:${userId}:${eventId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting life event:', error);
    return c.json({ success: false, error: 'Failed to delete life event' }, 500);
  }
});

// AI Chat Routes
app.get('/make-server-42a03002/ai-chat/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const messages = await kv.getByPrefix(`ai_chat:${userId}`);
    
    const parsedMessages = messages.map(message => JSON.parse(message))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return c.json({ success: true, data: parsedMessages });
  } catch (error) {
    console.log('Error fetching AI chat messages:', error);
    return c.json({ success: false, error: 'Failed to fetch messages' }, 500);
  }
});

app.post('/make-server-42a03002/ai-chat/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const messageData = await c.req.json();
    
    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id: messageId,
      userId,
      ...messageData,
      timestamp: new Date().toISOString()
    };
    
    await kv.set(`ai_chat:${userId}:${messageId}`, JSON.stringify(message));
    
    return c.json({ success: true, data: message });
  } catch (error) {
    console.log('Error saving AI chat message:', error);
    return c.json({ success: false, error: 'Failed to save message' }, 500);
  }
});

// Analysis Progress Routes
app.get('/make-server-42a03002/progress/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const progressData = await kv.get(`progress:${userId}`);
    
    const defaultProgress = {
      aiChat: 0,
      lifeChart: 0,
      futureVision: 0,
      strengthAnalysis: 0,
      experienceReflection: 0
    };
    
    const progress = progressData ? JSON.parse(progressData) : defaultProgress;
    
    return c.json({ success: true, data: progress });
  } catch (error) {
    console.log('Error fetching progress:', error);
    return c.json({ success: false, error: 'Failed to fetch progress' }, 500);
  }
});

app.put('/make-server-42a03002/progress/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const progressUpdates = await c.req.json();
    
    const existingProgress = await kv.get(`progress:${userId}`);
    const currentProgress = existingProgress ? JSON.parse(existingProgress) : {
      aiChat: 0,
      lifeChart: 0,
      futureVision: 0,
      strengthAnalysis: 0,
      experienceReflection: 0
    };
    
    const updatedProgress = {
      ...currentProgress,
      ...progressUpdates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`progress:${userId}`, JSON.stringify(updatedProgress));
    
    return c.json({ success: true, data: updatedProgress });
  } catch (error) {
    console.log('Error updating progress:', error);
    return c.json({ success: false, error: 'Failed to update progress' }, 500);
  }
});

// User Session/Profile Routes
app.post('/make-server-42a03002/user/:userId/session', async (c) => {
  try {
    const userId = c.req.param('userId');
    const sessionData = {
      userId,
      lastActive: new Date().toISOString(),
      sessionId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    await kv.set(`user_session:${userId}`, JSON.stringify(sessionData));
    
    return c.json({ success: true, data: sessionData });
  } catch (error) {
    console.log('Error creating user session:', error);
    return c.json({ success: false, error: 'Failed to create session' }, 500);
  }
});

// Future Vision Routes
app.get('/make-server-42a03002/future-vision/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const visionData = await kv.get(`future_vision:${userId}`);
    
    const defaultVision = {
      '5年後': {
        timeframe: '5年後',
        career: '',
        lifestyle: '',
        relationships: '',
        skills: '',
        values: '',
        achievements: '',
        challenges: '',
        learnings: ''
      },
      '10年後': {
        timeframe: '10年後',
        career: '',
        lifestyle: '',
        relationships: '',
        skills: '',
        values: '',
        achievements: '',
        challenges: '',
        learnings: ''
      },
      '20年後': {
        timeframe: '20年後',
        career: '',
        lifestyle: '',
        relationships: '',
        skills: '',
        values: '',
        achievements: '',
        challenges: '',
        learnings: ''
      }
    };
    
    const vision = visionData ? JSON.parse(visionData) : defaultVision;
    
    return c.json({ success: true, data: vision });
  } catch (error) {
    console.log('Error fetching future vision:', error);
    return c.json({ success: false, error: 'Failed to fetch future vision' }, 500);
  }
});

app.put('/make-server-42a03002/future-vision/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const visionUpdates = await c.req.json();
    
    const existingVision = await kv.get(`future_vision:${userId}`);
    const currentVision = existingVision ? JSON.parse(existingVision) : {};
    
    const updatedVision = {
      ...currentVision,
      ...visionUpdates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`future_vision:${userId}`, JSON.stringify(updatedVision));
    
    return c.json({ success: true, data: updatedVision });
  } catch (error) {
    console.log('Error updating future vision:', error);
    return c.json({ success: false, error: 'Failed to update future vision' }, 500);
  }
});

// Strength Analysis Routes
app.get('/make-server-42a03002/strength-analysis/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const strengthsData = await kv.getByPrefix(`strengths:${userId}`);
    const weaknessesData = await kv.getByPrefix(`weaknesses:${userId}`);
    
    const strengths = strengthsData.map(item => JSON.parse(item));
    const weaknesses = weaknessesData.map(item => JSON.parse(item));
    
    return c.json({ success: true, data: { strengths, weaknesses } });
  } catch (error) {
    console.log('Error fetching strength analysis:', error);
    return c.json({ success: false, error: 'Failed to fetch strength analysis' }, 500);
  }
});

app.post('/make-server-42a03002/strengths/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const strengthData = await c.req.json();
    
    const strengthId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const strength = {
      id: strengthId,
      userId,
      ...strengthData,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`strengths:${userId}:${strengthId}`, JSON.stringify(strength));
    
    return c.json({ success: true, data: strength });
  } catch (error) {
    console.log('Error creating strength:', error);
    return c.json({ success: false, error: 'Failed to create strength' }, 500);
  }
});

app.post('/make-server-42a03002/weaknesses/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const weaknessData = await c.req.json();
    
    const weaknessId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const weakness = {
      id: weaknessId,
      userId,
      ...weaknessData,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`weaknesses:${userId}:${weaknessId}`, JSON.stringify(weakness));
    
    return c.json({ success: true, data: weakness });
  } catch (error) {
    console.log('Error creating weakness:', error);
    return c.json({ success: false, error: 'Failed to create weakness' }, 500);
  }
});

// Experience Reflection Routes
app.get('/make-server-42a03002/experiences/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const experiences = await kv.getByPrefix(`experiences:${userId}`);
    
    const parsedExperiences = experiences.map(exp => JSON.parse(exp))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ success: true, data: parsedExperiences });
  } catch (error) {
    console.log('Error fetching experiences:', error);
    return c.json({ success: false, error: 'Failed to fetch experiences' }, 500);
  }
});

app.post('/make-server-42a03002/experiences/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const experienceData = await c.req.json();
    
    const experienceId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const experience = {
      id: experienceId,
      userId,
      ...experienceData,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`experiences:${userId}:${experienceId}`, JSON.stringify(experience));
    
    return c.json({ success: true, data: experience });
  } catch (error) {
    console.log('Error creating experience:', error);
    return c.json({ success: false, error: 'Failed to create experience' }, 500);
  }
});

// User Data Routes (for LibraryPage favorites, views, search history)
app.get('/make-server-42a03002/user-data/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const userData = await kv.get(`user_data:${userId}`);
    
    const defaultData = {
      favorites: [],
      views: {},
      searchHistory: []
    };
    
    const data = userData ? JSON.parse(userData) : defaultData;
    
    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error fetching user data:', error);
    return c.json({ success: false, error: 'Failed to fetch user data' }, 500);
  }
});

app.put('/make-server-42a03002/user-data/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const userData = await c.req.json();
    
    const dataToSave = {
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user_data:${userId}`, JSON.stringify(dataToSave));
    
    return c.json({ success: true, data: dataToSave });
  } catch (error) {
    console.log('Error updating user data:', error);
    return c.json({ success: false, error: 'Failed to update user data' }, 500);
  }
});

Deno.serve(app.fetch);