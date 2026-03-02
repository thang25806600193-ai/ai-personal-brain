class RoadmapService {
  constructor({ conceptRepository, quizResultRepository, knowledgeGapService, cacheService }) {
    this.conceptRepository = conceptRepository;
    this.quizResultRepository = quizResultRepository;
    this.knowledgeGapService = knowledgeGapService;
    this.cacheService = cacheService;
  }

  /**
   * Generate personalized learning roadmap for a subject
   * @param {number} userId
   * @param {number} subjectId
   * @returns {Object} Roadmap with weekly schedule and learning path
   */
  async generateRoadmap(userId, subjectId) {
    const cacheKey = `user:${userId}:subject:${subjectId}:roadmap`;
    const cached = await this.cacheService?.getJson(cacheKey);
    if (cached) return cached;

    // Step 1: Get all concepts and knowledge gaps
    const concepts = await this.conceptRepository.findBySubjectId(subjectId);
    const knowledgeGaps = await this.knowledgeGapService.analyzeSubject(userId, subjectId);

    // Step 2: Build dependency graph
    const dependencyGraph = this._buildDependencyGraph(concepts);

    // Step 3: Identify foundational concepts
    const foundationalConcepts = this._identifyFoundationalConcepts(dependencyGraph);

    // Step 4: Sort concepts by learning order (topological sort)
    const learningPath = this._generateLearningPath(dependencyGraph, foundationalConcepts, knowledgeGaps);

    // Step 5: Create weekly schedule
    const weeklySchedule = this._createWeeklySchedule(learningPath, knowledgeGaps);

    const roadmap = {
      subjectId,
      totalConcepts: concepts.length,
      foundationalConcepts: foundationalConcepts.map(c => c.term), // Field is 'term' not 'title'
      learningPath,
      weeklySchedule,
      estimatedWeeks: weeklySchedule.length,
      generatedAt: new Date()
    };

    await this.cacheService?.setJson(cacheKey, roadmap, 300);
    return roadmap;
  }

  /**
   * Build dependency graph from concept links
   */
  _buildDependencyGraph(concepts) {
    const graph = new Map();

    concepts.forEach(concept => {
      if (!graph.has(concept.id)) {
        graph.set(concept.id, {
          concept,
          prerequisites: [], // concepts that must be learned first
          dependents: [], // concepts that depend on this
          level: 0 // depth in dependency tree
        });
      }
    });

    // Build relationships from Relation model
    concepts.forEach(concept => {
      // Relations where this concept is the source
      if (concept.relatedFrom && Array.isArray(concept.relatedFrom)) {
        concept.relatedFrom.forEach(relation => {
          const targetNode = graph.get(relation.targetId);
          const sourceNode = graph.get(concept.id);

          if (targetNode && sourceNode) {
            // This concept depends on the target concept (target is prerequisite)
            sourceNode.prerequisites.push(relation.targetId);
            targetNode.dependents.push(concept.id);
          }
        });
      }

      // Relations where this concept is the target
      if (concept.relatedTo && Array.isArray(concept.relatedTo)) {
        concept.relatedTo.forEach(relation => {
          const sourceNode = graph.get(relation.sourceId);
          const targetNode = graph.get(concept.id);

          if (sourceNode && targetNode) {
            // This concept is a dependent of source concept
            sourceNode.dependents.push(concept.id);
            targetNode.prerequisites.push(relation.sourceId);
          }
        });
      }
    });

    return graph;
  }

  /**
   * Identify foundational concepts (few or no prerequisites)
   */
  _identifyFoundationalConcepts(graph) {
    const foundational = [];

    graph.forEach((node, id) => {
      if (node.prerequisites.length === 0) {
        foundational.push(node.concept);
      }
    });

    // If no concepts have zero prerequisites, pick those with fewest
    if (foundational.length === 0) {
      const minPrereqs = Math.min(...Array.from(graph.values()).map(n => n.prerequisites.length));
      graph.forEach((node, id) => {
        if (node.prerequisites.length === minPrereqs) {
          foundational.push(node.concept);
        }
      });
    }

    return foundational;
  }

  /**
   * Generate learning path using topological sort + knowledge gap priority
   */
  _generateLearningPath(graph, foundationalConcepts, knowledgeGaps) {
    const learningPath = [];
    const visited = new Set();
    const inProgress = new Set();

    // Map knowledge gaps by concept ID
    const gapMap = new Map();
    ['strong', 'medium', 'weak'].forEach(category => {
      knowledgeGaps[category]?.forEach(gap => {
        gapMap.set(gap.conceptId, { ...gap, category });
      });
    });

    const getStrategicWeight = (conceptId) => {
      const gapInfo = gapMap.get(conceptId) || {};
      const importance = gapInfo.importanceScore || 0;
      const foundation = gapInfo.foundationWeight || 0;
      return importance * 0.55 + foundation * 0.45;
    };

    // DFS with priority for weak concepts
    const dfs = (conceptId) => {
      if (visited.has(conceptId)) return;
      if (inProgress.has(conceptId)) return; // cycle detection

      inProgress.add(conceptId);
      const node = graph.get(conceptId);

      if (!node) {
        inProgress.delete(conceptId);
        return;
      }

      // Visit prerequisites first
      node.prerequisites.forEach(prereqId => {
        dfs(prereqId);
      });

      // Add to learning path
      if (!visited.has(conceptId)) {
        const gapInfo = gapMap.get(conceptId) || { category: 'unknown', score: 60 };
        const strategicWeight = getStrategicWeight(conceptId);

        let priority = 'low';
        if (gapInfo.category === 'weak' || strategicWeight >= 0.72) {
          priority = 'high';
        } else if (gapInfo.category === 'medium' || strategicWeight >= 0.5) {
          priority = 'medium';
        }

        learningPath.push({
          conceptId: node.concept.id,
          title: node.concept.term, // Field is 'term' not 'title' in schema
          definition: node.concept.definition,
          priority,
          score: gapInfo.score,
          importanceScore: gapInfo.importanceScore || 0,
          foundationWeight: gapInfo.foundationWeight || 0,
          strategicWeight: Number(strategicWeight.toFixed(3)),
          prerequisiteCount: node.prerequisites.length,
          dependentCount: node.dependents.length
        });
        visited.add(conceptId);
      }

      inProgress.delete(conceptId);
    };

    // Start with weak concepts and their prerequisites
    const weakConcepts = [...(knowledgeGaps.weak || [])].sort(
      (a, b) => getStrategicWeight(b.conceptId) - getStrategicWeight(a.conceptId)
    );
    weakConcepts.forEach(weak => {
      dfs(weak.conceptId);
    });

    // Then medium concepts
    const mediumConcepts = [...(knowledgeGaps.medium || [])].sort(
      (a, b) => getStrategicWeight(b.conceptId) - getStrategicWeight(a.conceptId)
    );
    mediumConcepts.forEach(medium => {
      dfs(medium.conceptId);
    });

    // Finally, remaining concepts
    graph.forEach((node, id) => {
      dfs(id);
    });

    return learningPath;
  }

  /**
   * Create weekly schedule from learning path
   */
  _createWeeklySchedule(learningPath, knowledgeGaps) {
    const schedule = [];
    const conceptsPerWeek = 3; // Configurable
    let weekNumber = 1;

    for (let i = 0; i < learningPath.length; i += conceptsPerWeek) {
      const weekConcepts = learningPath.slice(i, i + conceptsPerWeek);
      
      schedule.push({
        weekNumber,
        title: `Tuần ${weekNumber}`,
        concepts: weekConcepts.map(c => ({
          id: c.conceptId,
          title: c.title,
          priority: c.priority,
          score: c.score,
          status: 'pending' // pending, in-progress, completed
        })),
        focus: this._determineWeekFocus(weekConcepts),
        estimatedHours: weekConcepts.length * 2 // 2 hours per concept
      });

      weekNumber++;
    }

    return schedule;
  }

  /**
   * Determine main focus of the week
   */
  _determineWeekFocus(weekConcepts) {
    const highPriority = weekConcepts.filter(c => c.priority === 'high');
    if (highPriority.length > 0) {
      return `Ôn tập và củng cố: ${highPriority.map(c => c.title).join(', ')}`;
    }

    const titles = weekConcepts.map(c => c.title);
    if (titles.length === 1) {
      return `Học: ${titles[0]}`;
    }
    return `Học: ${titles.slice(0, 2).join(', ')}${titles.length > 2 ? ',...' : ''}`;
  }

  /**
   * Get next recommended concepts to study
   * @param {number} userId
   * @param {number} subjectId
   * @param {number} limit
   * @returns {Array} Recommended concepts
   */
  async getNextRecommendations(userId, subjectId, limit = 5) {
    const roadmap = await this.generateRoadmap(userId, subjectId);
    
    // Get concepts with high priority that haven't been mastered
    const recommendations = roadmap.learningPath
      .filter(c => c.priority === 'high' || c.priority === 'medium')
      .slice(0, limit)
      .map(c => ({
        ...c,
        reason: this._getRecommendationReason(c)
      }));

    return recommendations;
  }

  /**
   * Get recommendation reason
   */
  _getRecommendationReason(concept) {
    if (concept.priority === 'high') {
      if (concept.score < 40) {
        return 'Kiến thức còn yếu, cần ôn tập gấp';
      }
      return 'Cần củng cố để nắm vững';
    }
    
    if (concept.prerequisiteCount === 0) {
      return 'Kiến thức nền tảng';
    }

    if (concept.dependentCount > 3) {
      return 'Kiến thức quan trọng, liên kết nhiều concept khác';
    }

    return 'Tiếp theo trong lộ trình học';
  }
}

module.exports = RoadmapService;
