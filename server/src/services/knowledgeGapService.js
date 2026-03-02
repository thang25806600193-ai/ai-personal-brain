class KnowledgeGapService {
  constructor(conceptRepository, quizResultRepository) {
    this.conceptRepository = conceptRepository;
    this.quizResultRepository = quizResultRepository;
  }

  async analyzeSubject(userId, subjectId) {
    const concepts = await this.conceptRepository.findBySubjectId(subjectId);
    const quizHistory = await this.quizResultRepository.getAllForSubject(userId, subjectId, 200);
    const totalConcepts = concepts.length;

    const wrongMap = new Map();

    for (const result of quizHistory) {
      const wrongAnswers = Array.isArray(result.wrongAnswers) ? result.wrongAnswers : [];
      for (const wrong of wrongAnswers) {
        if (!wrong?.conceptId) continue;
        const entry = wrongMap.get(wrong.conceptId) || { count: 0, lastAt: null };
        entry.count += 1;
        const createdAt = new Date(result.createdAt);
        if (!entry.lastAt || createdAt > entry.lastAt) {
          entry.lastAt = createdAt;
        }
        wrongMap.set(wrong.conceptId, entry);
      }
    }

    const now = Date.now();

    const graphMap = this._buildGraphMetrics(concepts);

    const scored = concepts.map((concept) => {
      const linkCount = (concept.relatedFrom?.length || 0) + (concept.relatedTo?.length || 0);
      const hasDefinition = !!concept.definition?.trim();
      const hasExample = !!concept.example?.trim();

      const graphMetric = graphMap.get(concept.id) || {
        degree: linkCount,
        dependentCount: 0,
        prerequisiteCount: 0,
        importanceScore: 0,
        foundationWeight: 0,
        prerequisiteDepth: 0,
      };

      const wrongEntry = wrongMap.get(concept.id);
      const wrongCount = wrongEntry?.count || 0;
      const lastWrongAt = wrongEntry?.lastAt || null;
      const daysSinceLastWrong = lastWrongAt ? Math.floor((now - lastWrongAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

      let score = 60;
      score += Math.min(linkCount * 2, 20);
      score += hasDefinition ? 10 : -15;
      score += hasExample ? 5 : -5;
      score -= Math.min(wrongCount * 10, 40);
      score += Math.round(graphMetric.importanceScore * 20);
      score += Math.round(graphMetric.foundationWeight * 15);
      if (daysSinceLastWrong !== null) {
        score -= Math.min((daysSinceLastWrong / 7) * 5, 20);
      }

      score = Math.max(0, Math.min(100, Math.round(score)));

      const reasons = [];
      if (wrongCount >= 2) reasons.push('Sai nhiều lần');
      if (!hasExample) reasons.push('Thiếu ví dụ');
      if (linkCount <= 1) reasons.push('Ít liên kết');
      if (daysSinceLastWrong !== null && daysSinceLastWrong >= 30) reasons.push('Lâu chưa ôn');
      if (graphMetric.importanceScore >= 0.7) reasons.push('Concept quan trọng trong mạng tri thức');
      if (graphMetric.foundationWeight >= 0.65) reasons.push('Concept nền tảng cho nhiều kiến thức khác');

      return {
        conceptId: concept.id,
        term: concept.term,
        title: concept.term,
        score,
        wrongCount,
        linkCount,
        importanceScore: Number(graphMetric.importanceScore.toFixed(3)),
        foundationWeight: Number(graphMetric.foundationWeight.toFixed(3)),
        prerequisiteDepth: graphMetric.prerequisiteDepth,
        dependentCount: graphMetric.dependentCount,
        prerequisiteCount: graphMetric.prerequisiteCount,
        lastWrongAt,
        reasons
      };
    });

    const strong = scored.filter(c => c.score >= 75).sort((a, b) => b.score - a.score);
    const medium = scored.filter(c => c.score >= 55 && c.score < 75).sort((a, b) => b.score - a.score);
    const weak = scored.filter(c => c.score < 55).sort((a, b) => a.score - b.score);

    return {
      summary: {
        totalConcepts: scored.length,
        strong: strong.length,
        medium: medium.length,
        weak: weak.length
      },
      strong,
      medium,
      weak
    };
  }

  _buildGraphMetrics(concepts) {
    const map = new Map();

    for (const concept of concepts) {
      map.set(concept.id, {
        conceptId: concept.id,
        degree: 0,
        dependentCount: 0,
        prerequisiteCount: 0,
        neighbors: new Set(),
        prerequisites: new Set(),
        dependents: new Set(),
      });
    }

    for (const concept of concepts) {
      const current = map.get(concept.id);
      if (!current) continue;

      const outgoing = Array.isArray(concept.relatedFrom) ? concept.relatedFrom : [];
      const incoming = Array.isArray(concept.relatedTo) ? concept.relatedTo : [];

      for (const relation of outgoing) {
        current.neighbors.add(relation.targetId);
        current.prerequisites.add(relation.targetId);
      }

      for (const relation of incoming) {
        current.neighbors.add(relation.sourceId);
        current.dependents.add(relation.sourceId);
      }
    }

    let maxDegree = 1;
    let maxDependents = 1;
    for (const metric of map.values()) {
      metric.degree = metric.neighbors.size;
      metric.dependentCount = metric.dependents.size;
      metric.prerequisiteCount = metric.prerequisites.size;
      maxDegree = Math.max(maxDegree, metric.degree);
      maxDependents = Math.max(maxDependents, metric.dependentCount);
    }

    const depthMemo = new Map();
    const calcDepth = (conceptId, visiting = new Set()) => {
      if (depthMemo.has(conceptId)) return depthMemo.get(conceptId);
      if (visiting.has(conceptId)) return 0;

      visiting.add(conceptId);
      const metric = map.get(conceptId);
      if (!metric || metric.dependents.size === 0) {
        depthMemo.set(conceptId, 0);
        visiting.delete(conceptId);
        return 0;
      }

      let depth = 0;
      for (const dependentId of metric.dependents) {
        depth = Math.max(depth, 1 + calcDepth(dependentId, visiting));
      }

      depthMemo.set(conceptId, depth);
      visiting.delete(conceptId);
      return depth;
    };

    let maxDepth = 1;
    for (const concept of concepts) {
      const depth = calcDepth(concept.id);
      maxDepth = Math.max(maxDepth, depth);
    }

    for (const metric of map.values()) {
      const degreeCentrality = metric.degree / maxDegree;
      const dependentCentrality = metric.dependentCount / maxDependents;
      const prerequisiteDepth = depthMemo.get(metric.conceptId) || 0;
      const depthScore = prerequisiteDepth / maxDepth;
      const rootBonus = metric.prerequisiteCount === 0 ? 1 : 0;

      metric.prerequisiteDepth = prerequisiteDepth;
      metric.importanceScore = Math.min(1, degreeCentrality * 0.6 + dependentCentrality * 0.4);
      metric.foundationWeight = Math.min(1, depthScore * 0.75 + rootBonus * 0.25);
    }

    return map;
  }
}

module.exports = KnowledgeGapService;
