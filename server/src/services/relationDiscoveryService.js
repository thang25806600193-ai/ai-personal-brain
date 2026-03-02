class RelationDiscoveryService {
  constructor(aiService) {
    this.aiService = aiService;
  }

  _normalize(text) {
    return this.aiService.normalizeText(String(text || ''));
  }

  _pairKey(a, b) {
    return a < b ? `${a}::${b}` : `${b}::${a}`;
  }

  _relationKey(sourceId, targetId, type) {
    return `${sourceId}::${targetId}::${type}`;
  }

  detectRelations(concepts, textChunks = []) {
    if (!Array.isArray(concepts) || concepts.length < 2) {
      return [];
    }

    const preparedConcepts = concepts
      .filter((concept) => concept?.id && concept?.term)
      .map((concept) => ({
        id: concept.id,
        term: concept.term,
        normalizedTerm: this._normalize(concept.term),
      }))
      .filter((concept) => concept.normalizedTerm.length >= 3);

    if (preparedConcepts.length < 2) return [];

    const coOccurrenceCounter = new Map();
    const relationSet = new Set();

    for (const rawChunk of textChunks) {
      const normalizedChunk = this._normalize(rawChunk);
      if (!normalizedChunk || normalizedChunk.length < 20) continue;

      const present = preparedConcepts.filter((concept) =>
        normalizedChunk.includes(concept.normalizedTerm)
      );

      if (present.length < 2) continue;

      for (let i = 0; i < present.length; i++) {
        for (let j = i + 1; j < present.length; j++) {
          const first = present[i];
          const second = present[j];
          const key = this._pairKey(first.id, second.id);
          coOccurrenceCounter.set(key, (coOccurrenceCounter.get(key) || 0) + 1);
        }
      }

      for (const source of present) {
        for (const target of present) {
          if (source.id === target.id) continue;

          const isA = `${source.normalizedTerm} la mot loai ${target.normalizedTerm}`;
          const belongsTo = `${source.normalizedTerm} thuoc ${target.normalizedTerm}`;
          const dependsOn = `${source.normalizedTerm} phu thuoc ${target.normalizedTerm}`;

          if (normalizedChunk.includes(isA)) {
            relationSet.add(this._relationKey(source.id, target.id, 'is-a'));
          }

          if (normalizedChunk.includes(belongsTo)) {
            relationSet.add(this._relationKey(source.id, target.id, 'belongs-to'));
          }

          if (normalizedChunk.includes(dependsOn)) {
            relationSet.add(this._relationKey(source.id, target.id, 'depends-on'));
          }
        }
      }
    }

    for (const [key, count] of coOccurrenceCounter.entries()) {
      if (count < 2) continue;
      const [firstId, secondId] = key.split('::');
      const sourceId = firstId < secondId ? firstId : secondId;
      const targetId = firstId < secondId ? secondId : firstId;
      relationSet.add(this._relationKey(sourceId, targetId, 'co-occurs'));
    }

    return Array.from(relationSet).map((item) => {
      const [sourceId, targetId, type] = item.split('::');
      return { sourceId, targetId, type };
    });
  }
}

module.exports = RelationDiscoveryService;