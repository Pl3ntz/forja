# AI Features Documentation

Forja integrates with Groq (Llama 3.3 70B) to provide three AI-powered features: PDF parsing, ATS scoring, and CV translation.

All AI logic is centralized in `src/lib/ai-client.ts`.

---

## Setup

AI features are optional. To enable them, set the `GROQ_API_KEY` environment variable:

```env
GROQ_API_KEY=your-api-key-here
```

Get a free API key at [Groq Console](https://console.groq.com).

If the key is not set, AI endpoints will return an error but the rest of the application works normally.

---

## Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Model | `llama-3.3-70b-versatile` | 128K context, fast inference on Groq |
| Provider | Groq | OpenAI-compatible API, generous free tier |
| Timeout | 30 seconds | Fail fast if the API is slow |
| Temperature | `0` | Deterministic output for scoring and translation |
| Response format | `json_object` mode | Schema embedded in prompt, validated with Zod |

---

## Feature 1: PDF Import (`parseCvFromPdf`)

### What It Does

Takes a PDF resume file and extracts all content into the structured CV format used by the editor.

### How It Works

1. PDF buffer is parsed with `pdf-parse` to extract raw text
2. Extracted text is sent to Groq as a user message
3. The JSON schema (derived from Zod's `cvInputSchema`) is embedded in the system prompt
4. Groq extracts: header info, summary, education, experience, projects, skills, languages
5. Response is validated with Zod before returning

Note: Unlike providers that accept inline PDFs, Groq requires text-based input. The `pdf-parse` library handles text extraction locally before sending to the API. Image-based PDFs (scanned documents without OCR) are not supported.

### Prompt Strategy

The prompt instructs the AI to:
- Extract ALL information — no invention or hallucination
- Auto-detect language (or use provided locale hint)
- Map each section to the expected JSON structure
- Use locale-appropriate section titles
- Preserve original date formats

### Validation

- File must be `application/pdf` MIME type
- First 4 bytes must be PDF magic bytes (`%PDF`)
- Max file size: 5MB
- `pdf-parse` must extract non-empty text
- Groq response validated against `cvInputSchema`

---

## Feature 2: ATS Score Analysis (`analyzeCvAtsScore`)

### What It Does

Evaluates a CV for compatibility with major Applicant Tracking Systems (Workday, Greenhouse, Lever, iCIMS) and provides actionable improvement suggestions.

### Response Structure

```typescript
{
  overallScore: number       // 0-100, weighted average
  categories: [{
    name: string            // e.g., "Contact Info", "Experience"
    score: number           // 0-100
    feedback: string        // Explanation
    section: string         // "header" | "summary" | "experience" | etc.
  }]
  suggestions: [{
    text: string            // Actionable suggestion
    priority: string        // "critical" | "recommended" | "optional"
    section: string         // Which CV section it applies to
  }]
}
```

### Scoring Logic

- Each section scored 0-100 independently
- Overall score is a weighted average (Experience and Skills weighted higher)
- 3-7 suggestions provided per analysis
- Suggestions include priority levels:
  - **critical** — Missing information or formatting issues that will cause ATS rejection
  - **recommended** — Significant improvements for better parsing
  - **optional** — Polish items for marginally better results

### Performance Optimizations

1. **Input stripping** — `customLatex` (up to 100KB!) and `templateId` are removed before sending to the AI, saving significant tokens
2. **Compact JSON** — `JSON.stringify()` without indentation (no `null, 2`)
3. **In-memory cache** — Results cached for 5 minutes using SHA-256 hash of input:
   ```
   Cache key = SHA256({ stripped CV data, locale }).slice(0, 16)
   TTL = 5 minutes
   ```
   Same CV analyzed twice within 5 minutes returns instantly from cache.
4. **Concise prompt** — Minimal instruction set with JSON schema embedded in the system prompt

### Cache Behavior

```
First request:  CV data → hash → cache miss → API call → store result → return
Second request: CV data → hash → cache hit (< 5 min) → return immediately
After 5 min:    CV data → hash → cache expired → API call → update cache → return
```

The cache is a simple `Map<string, { result, expiry }>` in process memory. It resets when the server restarts.

---

## Feature 3: Clone & Translate (`translateCvContent`)

### What It Does

Takes a CV in one language and translates all content to the target language while preserving the JSON structure.

### Translation Rules

**Translated:**
- Section titles (e.g., "Experiencia Profissional" → "Professional Experience")
- Summary text
- Highlights and achievements
- Job titles and role descriptions
- Academic degrees
- Skill category names
- Language names and proficiency levels

**Preserved (not translated):**
- Proper names (people, companies, institutions)
- URLs, emails, phone numbers
- Technology names (React, Python, Docker, Laravel, etc.)
- JSON structure (exact same shape in/out)

### Performance Optimizations

Same as ATS scoring:
- Input stripping (no `customLatex`/`templateId`)
- Compact JSON serialization
- 30-second timeout

Translation does NOT use caching because different source CVs translate differently.

---

## Error Handling

All AI functions handle these error cases:

| Error | Handling |
|-------|----------|
| Missing API key | Throws `"GROQ_API_KEY is not configured"` |
| API timeout (>30s) | Throws `"Request timeout"` |
| Empty PDF text | Throws `"Could not extract text from PDF"` |
| Empty response | Throws descriptive error |
| Invalid JSON response | Throws `"Invalid response from AI service"` |
| Zod validation failure | Throws with validation details |
| Rate limit (429) | Caught as `rate_limit` or `429` in error message |

---

## JSON Schema Approach

Groq does not support strict `json_schema` response format like some providers. Instead:

1. The JSON schema is derived from Zod schemas using `z.toJSONSchema()`
2. The schema is serialized and embedded in the system prompt
3. `response_format: { type: 'json_object' }` ensures the response is valid JSON
4. Zod validates the parsed response on the client side

This approach is reliable with Llama 3.3 70B, which follows JSON schema instructions well.

---

## Cost Considerations

- **Groq free tier** provides generous rate limits for personal/small-team use
- Input stripping saves ~50-80% of tokens for CVs with custom LaTeX
- Compact JSON saves ~20-30% of input tokens vs pretty-printed
- ATS cache eliminates duplicate API calls within 5 minutes
- `pdf-parse` runs locally — no API cost for text extraction

---

## Adding New AI Features

To add a new AI feature:

1. Define a Zod schema for the expected response in `src/lib/zod-schemas/`
2. Write a prompt builder function that includes the JSON schema in the system prompt
3. Implement the async function following the existing pattern:
   - Strip input with `stripForAi()`
   - Build prompt with schema via `z.toJSONSchema()`
   - Call `groq.chat.completions.create()` with `json_object` response format
   - Race with timeout
   - Parse and validate response with Zod
   - Optionally add caching
4. Add the API route in `src/server/api/cv.ts`
5. Add rate limiting if the operation is expensive
