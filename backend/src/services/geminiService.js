const { generateContent } = require('../config/gemini');

/**
 * Parse JSON safely from Gemini's text response.
 * Strips markdown code fences if present.
 */
function parseJSON(text) {
  try {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse Gemini JSON response');
  }
}

// ============================================================
// DREAM ANALYSIS
// ============================================================
async function analyzeDream(rawInput) {
  const prompt = `You are a professional dream analyst and cinematic storyteller. Analyze the following dream narrative and extract structured information.

Dream narrative:
"""
${rawInput}
"""

Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
{
  "title": "A compelling cinematic title for this dream (5-8 words)",
  "summary": "A 2-3 sentence summary of the dream's core narrative",
  "theme": "The central theme (e.g. transformation, pursuit, loss, discovery)",
  "mood": "Overall emotional atmosphere (e.g. surreal, nostalgic, terrifying, hopeful)",
  "emotions": ["array", "of", "emotions", "present"],
  "settings": ["array", "of", "key", "locations"],
  "events": ["array", "of", "key", "narrative", "events"],
  "characters": [
    {
      "name": "Character name or descriptor if unnamed",
      "role": "protagonist/antagonist/guide/shadow/etc",
      "description": "Brief description from the dream"
    }
  ],
  "visualElements": ["array", "of", "striking", "visual", "elements"],
  "visualStyle": "Suggested cinematic visual style (e.g. dark surrealism, magical realism, noir)"
}`;

  const text = await generateContent(prompt);
  const analysis = parseJSON(text);

  const required = ['title', 'summary', 'theme', 'mood', 'emotions', 'settings', 'events', 'characters', 'visualElements', 'visualStyle'];
  for (const field of required) {
    if (!(field in analysis)) throw new Error(`Gemini response missing field: ${field}`);
  }

  return analysis;
}

// ============================================================
// STORY GENERATION
// ============================================================
async function generateStory(rawInput, analysis) {
  const prompt = `You are a cinematic screenwriter. Based on this dream analysis, write a compelling cinematic story.

Dream description:
"""
${rawInput}
"""

Dream analysis:
- Theme: ${analysis.theme}
- Mood: ${analysis.mood}
- Visual Style: ${analysis.visualStyle}
- Key Events: ${(analysis.events || []).join(', ')}

Return ONLY valid JSON (no markdown, no extra text):
{
  "title": "The cinematic title",
  "logline": "One compelling sentence that captures the entire story (max 50 words)",
  "story": "A full 4-6 paragraph cinematic narrative in present tense, vivid and atmospheric. Make it emotionally resonant and visually rich."
}`;

  const text = await generateContent(prompt);
  const story = parseJSON(text);

  if (!story.title || !story.logline || !story.story) {
    throw new Error('Gemini story response missing required fields');
  }

  return story;
}

// ============================================================
// CHARACTER GENERATION
// ============================================================
async function generateCharacters(rawInput, analysis) {
  const analysisChars = analysis.characters || [];
  const charList = analysisChars.map((c) => `- ${c.name} (${c.role}): ${c.description}`).join('\n');

  const prompt = `You are a professional character designer for film. Create detailed character profiles based on this dream.

Dream:
"""
${rawInput}
"""

Characters identified:
${charList || 'Infer characters from the dream context'}

Create detailed profiles for up to 5 characters. Return ONLY a valid JSON array (no markdown):
[
  {
    "name": "Character name",
    "role": "protagonist/antagonist/guide/supporting/symbolic",
    "ageRange": "Age range (e.g. 20s, middle-aged, elderly, child)",
    "appearance": "Detailed physical appearance: height, build, facial features, hair, eyes, skin",
    "personality": "Core personality traits and psychological profile (2-3 sentences)",
    "clothing": "Specific clothing description with colors, textures, style",
    "visualDescription": "Complete cinematographic character description for a visual artist"
  }
]`;

  const text = await generateContent(prompt);
  const characters = parseJSON(text);

  if (!Array.isArray(characters)) throw new Error('Gemini characters response must be an array');

  return characters;
}

// ============================================================
// SCENE GENERATION
// ============================================================
async function generateScenes(rawInput, analysis, story) {
  const prompt = `You are a film director and cinematographer. Break this cinematic dream story into detailed scenes.

Dream:
"""
${rawInput}
"""

Story:
"""
${story.story}
"""

Visual Style: ${analysis.visualStyle}
Mood: ${analysis.mood}
Theme: ${analysis.theme}

Generate exactly 6 cinematic scenes. Return ONLY a valid JSON array (no markdown):
[
  {
    "sceneNumber": 1,
    "title": "Scene title (3-5 words)",
    "description": "2-3 sentence narrative description of what happens",
    "duration": 6,
    "visualPrompt": "Highly detailed visual prompt for AI image generation: include subject, environment, action, composition, camera angle, lighting, atmosphere, mood, cinematic style, color palette, and character consistency notes. Minimum 80 words.",
    "cameraMovement": "Specific camera movement (e.g. slow dolly forward, aerial descent, handheld tracking shot)",
    "cameraAngle": "Camera angle (e.g. low angle, bird's eye, eye level, dutch angle)",
    "lighting": "Detailed lighting (e.g. golden hour backlight, harsh neon, soft moonlight)",
    "mood": "Emotional mood of this scene",
    "environment": "Detailed environment/setting description",
    "characters": ["character names present in this scene"]
  }
]`;

  const text = await generateContent(prompt);
  const scenes = parseJSON(text);

  if (!Array.isArray(scenes)) throw new Error('Gemini scenes response must be an array');

  return scenes.map((scene, idx) => ({
    ...scene,
    sceneNumber: scene.sceneNumber || idx + 1,
    duration: scene.duration || 5,
    characters: Array.isArray(scene.characters) ? scene.characters : [],
  }));
}

module.exports = { analyzeDream, generateStory, generateCharacters, generateScenes };
