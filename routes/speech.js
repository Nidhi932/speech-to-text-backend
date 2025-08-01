const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const supabase = require("../config/supabase");

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
});

// Real audio transcription using Deepgram
router.post("/transcribe/web", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Validate file size and format
    if (req.file.size > 1024 * 1024 * 1024) {
      return res
        .status(413)
        .json({ error: "File too large. Maximum size is 1GB." });
    }

    const allowedFormats = ["wav", "mp3", "m4a", "flac", "ogg", "webm"];
    const fileExt = req.file.originalname.toLowerCase().split(".").pop();
    if (!allowedFormats.includes(fileExt)) {
      return res.status(400).json({
        error:
          "Invalid audio format. Supported formats: MP3, WAV, M4A, FLAC, OGG, WEBM",
      });
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return res.status(500).json({ error: "Deepgram API key not configured" });
    }

    // Determine content type based on file extension
    const getContentType = (filename) => {
      const ext = filename.toLowerCase().split(".").pop();
      const contentTypes = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
        flac: "audio/flac",
        ogg: "audio/ogg",
        webm: "audio/webm",
      };
      return contentTypes[ext] || "audio/mpeg";
    };

    const contentType = getContentType(req.file.originalname);

    console.log("Sending to Deepgram:", {
      filename: req.file.originalname,
      size: req.file.size,
      contentType: contentType,
      hasProjectId: !!process.env.DEEPGRAM_PROJECT_ID,
    });

    const response = await axios.post(
      "https://api.deepgram.com/v1/listen",
      req.file.buffer,
      {
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": contentType,
          ...(process.env.DEEPGRAM_PROJECT_ID && {
            "X-Project-Id": process.env.DEEPGRAM_PROJECT_ID,
          }),
        },
        params: {
          model: "nova-2",
          language: "en-US",
          smart_format: true,
          punctuate: true,
          utterances: true,
        },
      }
    );

    const results = response.data.results;
    if (!results || !results.channels || !results.channels[0]) {
      return res
        .status(500)
        .json({ error: "No transcription results received" });
    }

    const channel = results.channels[0];
    const alternatives = channel.alternatives;
    if (!alternatives || alternatives.length === 0) {
      return res
        .status(500)
        .json({ error: "No transcription alternatives found" });
    }

    const bestAlternative = alternatives[0];

    const transcription = {
      text: bestAlternative.transcript,
      confidence: bestAlternative.confidence,
      language: "en-US",
      duration: results.metadata?.duration || null,
    };

    // Save transcription to Supabase
    const startTime = Date.now();
    const processingTime = Date.now() - startTime;

    const { data: savedTranscription, error: saveError } = await supabase
      .from("transcriptions")
      .insert([
        {
          filename: req.file.originalname,
          original_text: bestAlternative.transcript,
          file_size: req.file.size,
          file_type: req.file.mimetype || contentType,
          processing_time_ms: processingTime,
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("Error saving transcription to Supabase:", saveError);
      // Still return the transcription even if saving fails
    }

    res.json({
      success: true,
      transcription: transcription,
      service: "deepgram",
      saved: !saveError,
      transcription_id: savedTranscription?.id,
    });
  } catch (error) {
    console.error("Deepgram transcription error:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      },
    });

    let errorMessage = "Transcription failed";
    if (error.response?.status === 401) {
      errorMessage = "Invalid API key. Please check your Deepgram credentials.";
    } else if (error.response?.status === 413) {
      errorMessage = "Audio file too large. Please use a smaller file.";
    } else if (error.response?.status === 400) {
      errorMessage = "Invalid audio format. Please use MP3, WAV, M4A, or FLAC.";
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }

    res.status(500).json({
      error: errorMessage,
      message: error.message,
      details: error.response?.data,
    });
  }
});

// Test endpoint to verify Deepgram API key
router.get("/test", async (req, res) => {
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return res.status(500).json({ error: "Deepgram API key not configured" });
    }

    // Test the API key with a simple request
    const response = await axios.get("https://api.deepgram.com/v1/projects", {
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
      },
    });

    res.json({
      success: true,
      message: "Deepgram API key is valid",
      projects: response.data.projects,
    });
  } catch (error) {
    console.error(
      "Deepgram API test error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "Deepgram API key test failed",
      message: error.response?.data?.error || error.message,
    });
  }
});

module.exports = router;
