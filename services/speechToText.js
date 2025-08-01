const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

class SpeechToTextService {
  constructor() {
    this.deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    this.assemblyaiApiKey = process.env.ASSEMBLYAI_API_KEY;
  }

  // Web Speech API (client-side, but we can provide configuration)
  getWebSpeechConfig() {
    return {
      languages: [
        { code: "en-US", name: "English (US)" },
        { code: "en-GB", name: "English (UK)" },
        { code: "es-ES", name: "Spanish" },
        { code: "fr-FR", name: "French" },
        { code: "de-DE", name: "German" },
        { code: "it-IT", name: "Italian" },
        { code: "pt-BR", name: "Portuguese (Brazil)" },
        { code: "ja-JP", name: "Japanese" },
        { code: "ko-KR", name: "Korean" },
        { code: "zh-CN", name: "Chinese (Simplified)" },
        { code: "hi-IN", name: "Hindi" },
        { code: "ar-SA", name: "Arabic" },
        { code: "ru-RU", name: "Russian" },
        { code: "nl-NL", name: "Dutch" },
        { code: "sv-SE", name: "Swedish" },
      ],
      features: {
        continuous: true,
        interimResults: true,
        maxAlternatives: 1,
      },
    };
  }

  // Deepgram API integration
  async transcribeWithDeepgram(audioBuffer, options = {}) {
    if (!this.deepgramApiKey) {
      throw new Error("Deepgram API key not configured");
    }

    try {
      const config = {
        method: "post",
        url: "https://api.deepgram.com/v1/listen",
        headers: {
          Authorization: `Token ${this.deepgramApiKey}`,
          "Content-Type": "audio/wav",
        },
        data: audioBuffer,
        params: {
          model: options.model || "nova-2",
          language: options.language || "en-US",
          smart_format: true,
          punctuate: true,
          diarize: options.diarize || false,
          utterances: true,
          ...options,
        },
      };

      const response = await axios(config);
      return this.formatDeepgramResponse(response.data);
    } catch (error) {
      console.error(
        "Deepgram API error:",
        error.response?.data || error.message
      );
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }
  }

  // AssemblyAI API integration
  async transcribeWithAssemblyAI(audioBuffer, options = {}) {
    if (!this.assemblyaiApiKey) {
      throw new Error("AssemblyAI API key not configured");
    }

    try {
      // First, upload the audio file
      const uploadResponse = await axios.post(
        "https://api.assemblyai.com/v2/upload",
        audioBuffer,
        {
          headers: {
            Authorization: this.assemblyaiApiKey,
            "Content-Type": "application/octet-stream",
          },
        }
      );

      const audioUrl = uploadResponse.data.upload_url;

      // Then, submit for transcription
      const transcriptResponse = await axios.post(
        "https://api.assemblyai.com/v2/transcript",
        {
          audio_url: audioUrl,
          language_code: options.language || "en",
          punctuate: true,
          format_text: true,
          speaker_labels: options.speakerLabels || false,
          ...options,
        },
        {
          headers: {
            Authorization: this.assemblyaiApiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const transcriptId = transcriptResponse.data.id;

      // Poll for completion
      let transcript = null;
      while (!transcript) {
        const statusResponse = await axios.get(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          {
            headers: {
              Authorization: this.assemblyaiApiKey,
            },
          }
        );

        if (statusResponse.data.status === "completed") {
          transcript = statusResponse.data;
          break;
        } else if (statusResponse.data.status === "error") {
          throw new Error(
            `AssemblyAI transcription failed: ${statusResponse.data.error}`
          );
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return this.formatAssemblyAIResponse(transcript);
    } catch (error) {
      console.error(
        "AssemblyAI API error:",
        error.response?.data || error.message
      );
      throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
  }

  // Format Deepgram response
  formatDeepgramResponse(data) {
    const results = data.results;
    if (!results || !results.channels || !results.channels[0]) {
      throw new Error("Invalid Deepgram response format");
    }

    const channel = results.channels[0];
    const alternatives = channel.alternatives;

    if (!alternatives || alternatives.length === 0) {
      throw new Error("No transcription alternatives found");
    }

    const bestAlternative = alternatives[0];

    return {
      text: bestAlternative.transcript,
      confidence: bestAlternative.confidence,
      words: bestAlternative.words || [],
      language: data.metadata?.language || "en-US",
      duration: data.metadata?.duration || null,
      utterances: bestAlternative.paragraphs?.paragraphs || [],
      speaker_labels: bestAlternative.speakers || null,
    };
  }

  // Format AssemblyAI response
  formatAssemblyAIResponse(data) {
    return {
      text: data.text,
      confidence: data.confidence,
      words: data.words || [],
      language: data.language_code || "en",
      duration: data.audio_duration || null,
      utterances: data.utterances || [],
      speaker_labels: data.speaker_labels || null,
      chapters: data.chapters || [],
      entities: data.entities || [],
    };
  }

  // Get available models for each service
  getAvailableModels() {
    return {
      deepgram: [
        {
          id: "nova-2",
          name: "Nova 2 (Latest)",
          description: "Most accurate model",
        },
        { id: "nova", name: "Nova", description: "High accuracy model" },
        {
          id: "enhanced",
          name: "Enhanced",
          description: "Enhanced accuracy model",
        },
        { id: "base", name: "Base", description: "Standard accuracy model" },
      ],
      assemblyai: [
        {
          id: "default",
          name: "Default",
          description: "Standard accuracy model",
        },
        {
          id: "enhanced",
          name: "Enhanced",
          description: "Enhanced accuracy model",
        },
      ],
      webSpeech: [
        {
          id: "default",
          name: "Web Speech API",
          description: "Browser-based recognition",
        },
      ],
    };
  }

  // Get supported languages for each service
  getSupportedLanguages() {
    return {
      deepgram: [
        "en-US",
        "en-GB",
        "en-AU",
        "en-NZ",
        "en-IN",
        "es-ES",
        "es-419",
        "fr-FR",
        "de-DE",
        "it-IT",
        "pt-BR",
        "pt-PT",
        "ja-JP",
        "ko-KR",
        "zh-CN",
        "hi-IN",
        "ar-SA",
        "ru-RU",
        "nl-NL",
        "sv-SE",
      ],
      assemblyai: [
        "en",
        "es",
        "fr",
        "de",
        "it",
        "pt",
        "ja",
        "ko",
        "zh",
        "hi",
        "ar",
        "ru",
        "nl",
        "sv",
      ],
      webSpeech: [
        "en-US",
        "en-GB",
        "es-ES",
        "fr-FR",
        "de-DE",
        "it-IT",
        "pt-BR",
        "ja-JP",
        "ko-KR",
        "zh-CN",
      ],
    };
  }
}

module.exports = new SpeechToTextService();
