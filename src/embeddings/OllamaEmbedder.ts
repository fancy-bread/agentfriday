export class OllamaEmbedder {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async embed(content: string): Promise<Float32Array> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: content }),
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with status ${response.status}`);
    }

    const json = await response.json() as { embeddings?: number[][] };
    if (!Array.isArray(json.embeddings) || !Array.isArray(json.embeddings[0])) {
      throw new Error('Ollama response missing embeddings array');
    }

    return new Float32Array(json.embeddings[0]);
  }
}
