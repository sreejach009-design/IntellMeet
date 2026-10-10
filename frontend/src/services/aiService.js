import api from './api';

export const aiService = {
  async submitTranscript(meetingId, rawText, source = 'manual_submission') {
    const response = await api.post('/ai/transcribe', {
      meetingId,
      rawText,
      source,
    });
    return response.data;
  },

  async generateMeetingIntelligence(meetingId, transcriptText = null) {
    const response = await api.post('/ai/summarize', {
      meetingId,
      transcriptText,
    });
    return response.data;
  },

  async getMeetingAIResults(meetingId) {
    const response = await api.get(`/ai/summary/${meetingId}`);
    return response.data;
  },
};
