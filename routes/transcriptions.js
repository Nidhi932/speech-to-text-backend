const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// Get all transcriptions
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching transcriptions:", error);
    res.status(500).json({ error: "Failed to fetch transcriptions" });
  }
});

// Get a single transcription by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching transcription:", error);
    res.status(500).json({ error: "Failed to fetch transcription" });
  }
});

// Create a new transcription
router.post("/", async (req, res) => {
  try {
    const {
      filename,
      original_text,
      file_size,
      file_type,
      processing_time_ms,
    } = req.body;

    if (!filename || !original_text) {
      return res
        .status(400)
        .json({ error: "Filename and original_text are required" });
    }

    const { data, error } = await supabase
      .from("transcriptions")
      .insert([
        {
          filename,
          original_text,
          file_size,
          file_type,
          processing_time_ms,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating transcription:", error);
    res.status(500).json({ error: "Failed to create transcription" });
  }
});

// Update a transcription
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      filename,
      original_text,
      file_size,
      file_type,
      processing_time_ms,
    } = req.body;

    const { data, error } = await supabase
      .from("transcriptions")
      .update({
        filename,
        original_text,
        file_size,
        file_type,
        processing_time_ms,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error updating transcription:", error);
    res.status(500).json({ error: "Failed to update transcription" });
  }
});

// Delete a transcription
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("transcriptions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Transcription deleted successfully" });
  } catch (error) {
    console.error("Error deleting transcription:", error);
    res.status(500).json({ error: "Failed to delete transcription" });
  }
});

module.exports = router;
